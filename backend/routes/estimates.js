/**
 * Estimates API Routes
 */

const express = require('express');
const router = express.Router();
const estimateAI = require('../services/estimateAI');
const { authenticate } = require('../middleware/auth');
const db = require('../db');

/**
 * POST /api/estimates/generate
 * Generate new estimate from AI
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const {
      description,
      photos,
      projectType,
      location
    } = req.body;

    const userId = req.user.id;

    // Get user's pricing rules from database
    const userRules = await db.query(
      'SELECT pricing_rules FROM users WHERE id = $1',
      [userId]
    );

    const pricingRules = userRules.rows[0]?.pricing_rules || null;

    // Generate estimate
    const estimate = await estimateAI.generateEstimate(
      {
        description,
        photos,
        projectType,
        location
      },
      pricingRules
    );

    // Save to database
    const result = await db.query(
      `INSERT INTO estimates 
       (user_id, project_title, description, line_items, subtotal, tax, total, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        userId,
        estimate.projectTitle,
        description,
        JSON.stringify(estimate.lineItems),
        estimate.subtotal,
        estimate.tax,
        estimate.total,
        'draft'
      ]
    );

    const estimateId = result.rows[0].id;

    res.json({
      success: true,
      estimateId,
      estimate
    });

  } catch (error) {
    console.error('Error generating estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate estimate'
    });
  }
});

/**
 * POST /api/estimates/clarify
 * Ask clarifying questions about project
 */
router.post('/clarify', authenticate, async (req, res) => {
  try {
    const { description, conversationHistory } = req.body;

    const questions = await estimateAI.askClarifyingQuestions(
      description,
      conversationHistory
    );

    res.json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('Error getting clarifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate questions'
    });
  }
});

/**
 * GET /api/estimates/:id
 * Get estimate by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `SELECT * FROM estimates 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Estimate not found'
      });
    }

    res.json({
      success: true,
      estimate: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch estimate'
    });
  }
});

/**
 * GET /api/estimates
 * List user's estimates
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT id, project_title, total, status, created_at
       FROM estimates 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      estimates: result.rows
    });

  } catch (error) {
    console.error('Error listing estimates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list estimates'
    });
  }
});

/**
 * PUT /api/estimates/:id
 * Update estimate
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { lineItems, projectTitle, status } = req.body;

    // Recalculate totals if line items changed
    let subtotal, tax, total;
    if (lineItems) {
      subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      tax = subtotal * 0.08; // TODO: Get from user settings
      total = subtotal + tax;
    }

    await db.query(
      `UPDATE estimates 
       SET project_title = COALESCE($1, project_title),
           line_items = COALESCE($2, line_items),
           subtotal = COALESCE($3, subtotal),
           tax = COALESCE($4, tax),
           total = COALESCE($5, total),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8`,
      [projectTitle, JSON.stringify(lineItems), subtotal, tax, total, status, id, userId]
    );

    res.json({
      success: true,
      message: 'Estimate updated'
    });

  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update estimate'
    });
  }
});

/**
 * POST /api/estimates/:id/pdf
 * Generate PDF for estimate
 */
router.post('/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get estimate
    const result = await db.query(
      `SELECT * FROM estimates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = result.rows[0];

    // Generate PDF (implement PDFService)
    const PDFService = require('../services/pdfService');
    const pdfBuffer = await PDFService.generateEstimatePDF(estimate);

    res.contentType('application/pdf');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF'
    });
  }
});

/**
 * POST /api/estimates/:id/send-to-servicebook
 * Push estimate to ServiceBook Pros (if integrated)
 */
router.post('/:id/send-to-servicebook', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has ServiceBook integration
    const userResult = await db.query(
      'SELECT servicebook_integration FROM users WHERE id = $1',
      [userId]
    );

    const integration = userResult.rows[0]?.servicebook_integration;

    if (!integration || !integration.enabled) {
      return res.status(400).json({
        success: false,
        error: 'ServiceBook Pros integration not enabled'
      });
    }

    // Get estimate
    const estResult = await db.query(
      'SELECT * FROM estimates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (estResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = estResult.rows[0];

    // Push to ServiceBook Pros via Knack API
    const ServiceBookService = require('../services/servicebookIntegration');
    const knackEstimateId = await ServiceBookService.pushEstimate(
      estimate,
      integration.apiKey,
      integration.appId
    );

    res.json({
      success: true,
      knackEstimateId,
      message: 'Estimate pushed to ServiceBook Pros'
    });

  } catch (error) {
    console.error('Error sending to ServiceBook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to push to ServiceBook Pros'
    });
  }
});

module.exports = router;
