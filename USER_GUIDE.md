# SafariCharge Dashboard - User Guide

## New Features Overview

Your SafariCharge dashboard now includes powerful features for planning and sizing solar installations anywhere in Kenya, including location-aware recommendations and scenario management.

## 3. Scenario Management 📋

Save, compare, and restore named system configurations so you can evaluate multiple sizing options without losing your work.

### What it does
- **Save** a snapshot of the current system configuration (PV capacity, battery, inverter) together with live KPI values (self-sufficiency, solar production, savings).
- **Compare** up to any number of saved scenarios side-by-side in the `/scenarios` page with delta indicators showing which configuration performs better.
- **Load** a saved scenario back to the dashboard to restore its system configuration.
- **Delete** scenarios you no longer need.

### How to save a scenario

1. Configure and simulate your system on the **Dashboard** page.
2. Click the **🔖 bookmark icon** (Save scenario) in the top-right of the dashboard header.
3. Enter a descriptive name in the dialog, for example *"10 kW PV + 50 kWh Battery"*, and click **Save**.
4. A toast notification confirms the scenario has been saved.

### Viewing and comparing scenarios

1. Click **Scenarios** in the left sidebar (or navigate to `/scenarios`).
2. The table lists all saved scenarios with key metrics:
   - PV capacity (kW) and Battery capacity (kWh)
   - Total solar generation (kWh)
   - Self-sufficiency percentage
   - Average battery SOC
   - Cumulative savings (KES)
   - Financial KPIs: NPV, IRR, payback period (when available)
3. To compare against a **baseline**, click any scenario name in the *Comparison baseline* selector panel.
   - Green 📈 indicators show values better than the baseline.
   - Red 📉 indicators show values worse than the baseline.
4. Use the **Load** button (↑ icon) to restore a scenario's system configuration to the dashboard.
5. Use the **Delete** button (🗑 icon) to permanently remove a scenario.

### Typical workflow for system sizing decisions

1. Start with a conservative configuration (e.g. 5 kW PV, 20 kWh battery). Save as *"Base case"*.
2. Increase PV capacity to 10 kW. Save as *"10 kW PV option"*.
3. Add a larger battery (50 kWh). Save as *"Full build"*.
4. Open the Scenarios page, set *"Base case"* as the baseline, and compare KPIs across all three to identify the configuration with the best financial and performance trade-off.

> **Note:** Scenarios are stored in memory and will reset when you refresh the page. This is by design in the current sandboxed environment. Use **Export** on the dashboard to persist data externally.

## 1. Location Selector 📍

### What it does
Provides accurate solar irradiance data for your specific location in Kenya, rather than using generic Nairobi data.

### How to use it
1. **Find the location dropdown** in the top-right of the dashboard header (next to the date)
2. **Click on the dropdown** to see available options
3. **Select a city** from the list of 10 major Kenya locations:
   - Nairobi
   - Kisumu
   - Mombasa
   - Eldoret
   - Nakuru
   - Turkana (Lodwar)
   - Kisii
   - Embu
   - Meru
   - Garissa

4. **Or enter custom coordinates** for any location:
   - Scroll to the bottom of the dropdown
   - Enter latitude and longitude
   - Click "Apply Custom Location"

### What happens next
- System fetches real solar data from NASA POWER API
- All simulations now use location-specific solar irradiance
- More accurate results for your specific area

### Example Use Case
**Before**: All calculations assumed Nairobi sun levels (5.4 kWh/m²/day average)
**After**:
- Turkana: 6.5 kWh/m²/day (20% more sun!)
- Kisii: 4.8 kWh/m²/day (11% less sun)
- Your recommendations will be sized accordingly

## 2. Hardware Recommendation System 🎯

### What it does
Analyzes your energy consumption patterns and recommends specific solar hardware with detailed financial analysis.

### How to use it
1. **Run a simulation first**
   - Click ▶️ Play to start the simulation
   - Let it run for at least one full day (24 hours simulated time)
   - The more days you simulate, the better the recommendation

2. **Click "Get Recommendation"** button in the header (green button)

3. **Review your recommendation** which includes:
   - Solar panel specifications
   - Battery storage requirements
   - Inverter sizing
   - Total investment cost
   - Monthly and annual savings
   - Payback period
   - 25-year ROI
   - Environmental impact

### Understanding Your Recommendation

#### Solar Panels Section
- **Total Capacity**: How many kW of solar panels you need
- **Number of Panels**: Exact panel count (assumes 550W panels)
- **Estimated Cost**: Total cost in KES
- **Monthly Savings**: How much this portion saves you

Example: "12.5 kW • 23 × 550W panels"

#### Battery Storage Section
- **Capacity**: How many kWh of storage you need
- **Type**: LiFePO4 (premium, 10-15 year life) or Lead-Acid (budget, 3-5 year life)
- **Configuration**: Voltage and amp-hours
- **Cost**: Total cost in KES

Example: "45 kWh LiFePO4 • 48V system • 6 × 200Ah batteries"

#### Inverter Section
- **Capacity**: Rated output in kW (sized for your peak demand)
- **Type**: Hybrid (with backup) or Grid-tie only
- **Cost**: Total cost in KES

Example: "15 kW Hybrid Grid-Tie + Backup"

#### Financial Analysis 💰
- **Total Investment**: Equipment + 15% installation
- **Monthly Savings**: Based on your KPLC rates and usage pattern
- **Annual Savings**: Monthly × 12
- **Payback Period**: Years until system pays for itself
- **25-Year ROI**: Return on investment over system lifetime
- **Net Savings**: Total profit over 25 years

Example:
- Investment: KES 2,450,000
- Monthly Savings: KES 58,000
- Payback: 4.2 years
- ROI: 1,247%
- Net Savings: KES 15.8M

#### Environmental Impact 🌱
- **Grid Dependency Reduction**: % of energy from solar vs grid
- **Daily Solar Generation**: Average kWh produced per day
- **Annual CO₂ Savings**: Kilograms of CO₂ prevented
- **Equivalent Trees**: How many trees absorb this much CO₂

### Confidence Levels

Recommendations come with confidence ratings:

- **🟢 HIGH** (Green): Excellent data, reliable recommendation
- **🟡 MEDIUM** (Yellow): Good data, recommendation is solid
- **🟠 LOW** (Orange): Limited data, use as rough estimate

### Notes & Recommendations

Each recommendation includes specific advice like:
- "Excellent solar resource at Turkana (6.5 kWh/m²/day). This location is ideal for solar investment."
- "LiFePO4 batteries recommended for 10-15 year lifespan and minimal maintenance."
- "Excellent ROI - this system will pay for itself quickly given your consumption pattern."

## Tips for Best Results

### 1. Run realistic simulations
- Use typical appliance loads
- Include your actual EV charging patterns
- Run for multiple days to get average consumption

### 2. Choose your actual location
- Use the location where you'll install the system
- Custom coordinates are more accurate than city approximations

### 3. Try different scenarios
- Simulate weekday vs weekend usage
- Test different weather conditions (Sunny/Cloudy/Rainy)
- Compare peak vs off-peak consumption patterns

### 4. Use recommendations for planning
- Share with installers for accurate quotes
- Present to investors or management
- Compare different system configurations

## Frequently Asked Questions

**Q: How accurate is the NASA POWER data?**
A: Very accurate. It's based on 10+ years of NASA satellite and meteorological data, averaged monthly. This is the same data used by professional solar designers worldwide.

**Q: Why are Turkana recommendations different from Nairobi?**
A: Turkana receives significantly more sun (6.5 vs 5.4 kWh/m²/day). You'll need fewer panels for the same energy output, reducing costs.

**Q: Should I choose LiFePO4 or Lead-Acid batteries?**
A:
- **LiFePO4**: Higher upfront cost, but 10-15 year lifespan, minimal maintenance, better performance. Recommended for most commercial installations.
- **Lead-Acid**: Lower upfront cost, but 3-5 year lifespan, requires regular maintenance. Consider if budget-constrained.

**Q: Can I trust the financial calculations?**
A: Calculations use actual KPLC E-Mobility tariff rates (KES 26/kWh peak, KES 16/kWh off-peak) and realistic market pricing. Payback periods account for 1.5% annual maintenance costs. However, actual results depend on your usage patterns and future tariff changes.

**Q: What if I need a different system size?**
A: The recommendation is based on your simulated consumption. To get recommendations for different sizes:
1. Adjust appliance loads in the simulation
2. Change EV charging patterns
3. Run a new simulation
4. Get a new recommendation

**Q: Can I export recommendations?**
A: Currently, you can screenshot the recommendation panel. Future updates will include PDF export for investor presentations.

**Q: Do I need an API key for NASA POWER?**
A: No! NASA POWER API is completely free and requires no authentication.

## Technical Specifications

### Pricing (Kenya Market 2026 Estimates)
- Solar panels: KES 55/watt
- LiFePO4 batteries: KES 45,000/kWh
- Lead-Acid batteries: KES 18,000/kWh
- Hybrid inverters: KES 35,000/kW
- Grid-tie inverters: KES 22,000/kW
- Installation: 15% of equipment cost

### System Assumptions
- Panel efficiency: 85% (accounts for inverter losses, wiring, soiling)
- Battery voltage: 48V (standard)
- Panel wattage: 550W (modern high-efficiency)
- Safety margin: 25% on inverter sizing
- Maintenance: 1.5% annually
- System lifetime: 25 years
- Grid emission factor: 0.47 kg CO₂/kWh

## Support

For issues or questions:
1. Check the Implementation Summary (IMPLEMENTATION_SUMMARY.md) for technical details
2. Report issues at: https://github.com/rauell1/safaricharge/issues
3. Review the feedback document that inspired these features

---

**Happy Solar Planning! ☀️🔋**
