# 🧪 Manual Testing Guide - EstimatorAI

**Status:** Backend fully functional, needs UI verification  
**Time Required:** ~5 minutes  
**Production URL:** https://estimatorai.com

---

## Quick Test (5 minutes)

### 1. Login
- Go to: https://estimatorai.com/login
- Email: `test@alviselectrical.com`
- Password: `password`
- Click "Login"

**Expected:** Redirects to dashboard

---

### 2. Generate Estimate
- Go to: https://estimatorai.com/estimate
- Paste this in the description box:

```
I need to upgrade electrical service for a small restaurant.
Current: 100A panel, need 200A service.
Includes:
- New 200A panel installation
- Service upgrade from meter to panel
- 50 ft of 4/0 copper wire
- Trenching 30 ft for underground service
- Permit and inspection
```

- Click "Generate Estimate"
- Wait ~10 seconds

**Expected Results:**
```
✅ Estimate appears with:
   - Project title: "Electrical Service Upgrade..." 
   - Line items with categories (Labor, Materials, Permits)
   - Electrical-specific details (wire, conduit, panels)
   - Labor rates around $95/hr
   - Materials with costs
   - Permit fees
   - Assumptions about site conditions
   - Disclaimer about final pricing
   - Timeline (1-3 days)
   - Total cost with tax (~$2,000-3,000)
```

---

### 3. Verify Details
Check that the estimate includes:

**Labor Items:**
- [ ] Panel installation (hours × $95/hr)
- [ ] Trenching work (hours × $95/hr)

**Materials:**
- [ ] 200A electrical panel (~$400-600)
- [ ] 4/0 copper wire (~$150-250)
- [ ] Conduit mention

**Other:**
- [ ] Permit costs (~$150-250)
- [ ] Tax calculation (8%)
- [ ] Total amount
- [ ] Assumptions list
- [ ] Recommendations (optional)
- [ ] Timeline estimate

---

### 4. Test Features

**Download PDF:**
- [ ] Click "Download PDF" button
- [ ] PDF downloads successfully
- [ ] PDF contains estimate details

**Dashboard:**
- [ ] Go to https://estimatorai.com/dashboard
- [ ] See your generated estimate listed
- [ ] Shows project title, total, date
- [ ] Can view/edit/delete

---

## ✅ Success Criteria

If you can complete all 4 steps above successfully, then:

**🎉 EstimatorAI is fully functional!**

The AI estimate generation works end-to-end with electrical contractor focus.

---

## 🐛 If Something Fails

### Login doesn't work
- Check browser console for errors (F12)
- Try clearing cookies and retry
- Verify you're using correct credentials

### Generate button doesn't respond
- Check browser console for errors
- Check network tab for failed API calls
- Look for 401 (auth issue) or 500 (server error)

### Estimate is blank or generic
- Check if line items include electrical details
- Verify labor rates are around $95/hr
- Check if assumptions mention site conditions
- If it's too generic, the AI prompt may need adjustment

### PDF doesn't download
- Check browser console for errors
- Try right-click → "Open in new tab"
- Check if backend has PDF generation errors

---

## 📊 What to Report Back

**If it works:**
```
✅ EstimatorAI is working!
- Login: works
- Generate: works
- Output quality: [excellent/good/needs improvement]
- PDF: works
- Dashboard: works
```

**If it fails:**
```
❌ Issue found:
- Step that failed: [login/generate/pdf/dashboard]
- Error message: [paste error]
- Browser console errors: [paste if any]
- Screenshot: [attach if helpful]
```

---

## 🔍 Advanced Testing (Optional)

### Test Different Scenarios:

**Simple job:**
```
Install a new 100A subpanel in a garage. 
Need 20 ft of wire and 2 hours labor.
```

**Complex job:**
```
Complete electrical rewiring of 2000 sq ft office.
Replace old knob-and-tube wiring, install new panel, 
add 20 new circuits, upgrade to 200A service.
Includes permit and city inspection.
```

**Service call:**
```
Emergency repair: main breaker keeps tripping.
Diagnose and repair electrical fault.
May need panel replacement.
```

### Verify Output Quality:

For each test, check:
- [ ] Line items are specific and detailed
- [ ] Quantities are reasonable
- [ ] Prices are realistic for electrical work
- [ ] Assumptions address unknowns
- [ ] Recommendations make sense
- [ ] Total cost is in expected range

---

## 💡 Tips

1. **Be detailed in descriptions** - More detail = better estimates
2. **Include measurements** - "50 ft of wire" is better than "some wire"
3. **Mention current state** - "100A panel" vs "200A panel"
4. **Specify location** - Indoor vs outdoor affects cost
5. **Note access issues** - "Tight attic space" affects labor

---

**Last Updated:** 2026-02-19  
**Version:** 1.0
