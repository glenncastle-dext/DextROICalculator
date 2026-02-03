/**
 * Dext ROI Calculator
 * Based on ATO eInvoicing Value Assessment methodology
 * https://www.ato.gov.au/businesses-and-organisations/einvoicing/value-assessment-report/cost-calculations
 * 
 * Key formula:
 * - ATO Total Cost (PDF): $27.67
 * - AP Portion (60%): $16.60 (processing, not creation)
 * - With Dext: $16.60 × (time with Dext / time without Dext)
 */

// ========================================
// ATO Cost Constants
// ========================================
const ATO_CONSTANTS = {
    totalCostPdf: 27.67,       // ATO total cost for PDF invoice
    apProportion: 0.60,        // 60% for Accounts Payable (processing)
    arProportion: 0.40,        // 40% for Accounts Receivable (creation)
    baselineTimeMinutes: 21    // ATO baseline processing time (minutes)
};

// Calculate AP base cost
const AP_BASE_COST = ATO_CONSTANTS.totalCostPdf * ATO_CONSTANTS.apProportion;  // $16.60

// ========================================
// Default Time Benchmarks (Source: ATO/Deloitte Access Economics)
// All times in MINUTES per invoice
// ========================================
const DEFAULT_TIMES = {
    // Without Dext - Manual processing
    without: {
        receipt: 7,        // Receiving and entering into systems
        validation: 2,     // Validate supplier, ABN, GST
        review: 7,         // Business review of invoice details
        approval: 5        // Approving for payment
    },
    // With Dext - Automated processing
    with: {
        receipt: 1,        // Auto-capture, OCR extraction (~30 sec)
        validation: 1,     // Auto ABN lookup, GST check, duplicate detection
        review: 7,         // Business review still required (no change)
        approval: 3        // Streamlined workflow approval
    }
};

// ========================================
// Calculator State
// ========================================
let calculatorState = {
    // Volume inputs
    numClients: 50,
    invoicesPerClient: 40,
    
    // Time per invoice - Without Dext (minutes)
    timeReceiptWithout: DEFAULT_TIMES.without.receipt,
    timeValidationWithout: DEFAULT_TIMES.without.validation,
    timeReviewWithout: DEFAULT_TIMES.without.review,
    timeApprovalWithout: DEFAULT_TIMES.without.approval,
    
    // Time per invoice - With Dext (minutes)
    timeReceiptWith: DEFAULT_TIMES.with.receipt,
    timeValidationWith: DEFAULT_TIMES.with.validation,
    timeReviewWith: DEFAULT_TIMES.with.review,
    timeApprovalWith: DEFAULT_TIMES.with.approval
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    // Volume inputs
    numClients: document.getElementById('numClients'),
    numClientsValue: document.getElementById('numClientsValue'),
    invoicesPerClient: document.getElementById('invoicesPerClient'),
    invoicesPerClientValue: document.getElementById('invoicesPerClientValue'),
    
    // Time inputs - Without Dext
    timeReceiptWithout: document.getElementById('timeReceiptWithout'),
    timeValidationWithout: document.getElementById('timeValidationWithout'),
    timeReviewWithout: document.getElementById('timeReviewWithout'),
    timeApprovalWithout: document.getElementById('timeApprovalWithout'),
    totalTimeWithout: document.getElementById('totalTimeWithout'),
    
    // Time inputs - With Dext
    timeReceiptWith: document.getElementById('timeReceiptWith'),
    timeValidationWith: document.getElementById('timeValidationWith'),
    timeReviewWith: document.getElementById('timeReviewWith'),
    timeApprovalWith: document.getElementById('timeApprovalWith'),
    totalTimeWith: document.getElementById('totalTimeWith'),
    
    // ATO formula display
    apBaseCost: document.getElementById('apBaseCost'),
    timeRatioDisplay: document.getElementById('timeRatioDisplay'),
    dextCostPerInvoice: document.getElementById('dextCostPerInvoice'),
    
    // Results
    totalDocsMonthly: document.getElementById('totalDocsMonthly'),
    totalDocsAnnually: document.getElementById('totalDocsAnnually'),
    timePerInvoiceWithout: document.getElementById('timePerInvoiceWithout'),
    timePerInvoiceWith: document.getElementById('timePerInvoiceWith'),
    timeSavedPerInvoice: document.getElementById('timeSavedPerInvoice'),
    totalTimeWithoutResult: document.getElementById('totalTimeWithoutResult'),
    totalTimeWithResult: document.getElementById('totalTimeWithResult'),
    timeSavedMonthly: document.getElementById('timeSavedMonthly'),
    totalTimeWithoutAnnual: document.getElementById('totalTimeWithoutAnnual'),
    totalTimeWithAnnual: document.getElementById('totalTimeWithAnnual'),
    timeSavedAnnually: document.getElementById('timeSavedAnnually'),
    costPerInvoiceWithoutDisplay: document.getElementById('costPerInvoiceWithoutDisplay'),
    costPerInvoiceWithDisplay: document.getElementById('costPerInvoiceWithDisplay'),
    costSavedPerInvoice: document.getElementById('costSavedPerInvoice'),
    costWithout: document.getElementById('costWithout'),
    costWith: document.getElementById('costWith'),
    costSavingsMonthly: document.getElementById('costSavingsMonthly'),
    costWithoutAnnually: document.getElementById('costWithoutAnnually'),
    costWithAnnually: document.getElementById('costWithAnnually'),
    costSavingsAnnually: document.getElementById('costSavingsAnnually'),
    dextCostMonthly: document.getElementById('dextCostMonthly'),
    dextCostAnnually: document.getElementById('dextCostAnnually'),
    annualSavings: document.getElementById('annualSavings'),
    roiPercent: document.getElementById('roiPercent'),
    paybackPeriod: document.getElementById('paybackPeriod'),
    
    // Print report elements
    reportDate: document.getElementById('reportDate'),
    reportClients: document.getElementById('reportClients'),
    reportInvoices: document.getElementById('reportInvoices'),
    reportTimeReduction: document.getElementById('reportTimeReduction'),
    reportDocsMonthly: document.getElementById('reportDocsMonthly'),
    reportTimeWithout: document.getElementById('reportTimeWithout'),
    reportTimeWith: document.getElementById('reportTimeWith'),
    reportTimeSaved: document.getElementById('reportTimeSaved'),
    reportAnnualSavings: document.getElementById('reportAnnualSavings'),
    reportErrorSavings: document.getElementById('reportErrorSavings'),
    reportROI: document.getElementById('reportROI'),
    reportPayback: document.getElementById('reportPayback')
};

// ========================================
// Dext Pricing
// ========================================
const DEXT_PRICING = {
    perClientPerMonth: 33.00,  // $33 per client per month
    volumeDiscount: {
        tier1: { clients: 50, discount: 0 },
        tier2: { clients: 100, discount: 0.10 },
        tier3: { clients: 200, discount: 0.15 },
        tier4: { clients: 500, discount: 0.20 }
    }
};

// ========================================
// Calculation Functions
// ========================================

/**
 * Calculate total time per invoice WITHOUT Dext (in minutes)
 */
function getTotalTimeWithout() {
    return calculatorState.timeReceiptWithout +
           calculatorState.timeValidationWithout +
           calculatorState.timeReviewWithout +
           calculatorState.timeApprovalWithout;
}

/**
 * Calculate total time per invoice WITH Dext (in minutes)
 */
function getTotalTimeWith() {
    return calculatorState.timeReceiptWith +
           calculatorState.timeValidationWith +
           calculatorState.timeReviewWith +
           calculatorState.timeApprovalWith;
}

/**
 * Calculate cost per invoice using ATO methodology
 * Cost = AP Base Cost × (time / baseline time)
 * - Without Dext: $16.60 (60% of $27.67)
 * - With Dext: $16.60 × (timeWith / timeWithout)
 */
function getCostPerInvoiceWithout() {
    // AP portion of ATO cost = $16.60
    return AP_BASE_COST;
}

function getCostPerInvoiceWith() {
    const timeWithout = getTotalTimeWithout();
    const timeWith = getTotalTimeWith();
    
    // Avoid division by zero
    if (timeWithout === 0) return AP_BASE_COST;
    
    // Cost with Dext = AP base cost × (time ratio)
    return AP_BASE_COST * (timeWith / timeWithout);
}

/**
 * Calculate Dext monthly subscription cost based on number of clients
 */
function calculateDextMonthlyCost(numClients) {
    let pricePerClient = DEXT_PRICING.perClientPerMonth;
    
    if (numClients >= DEXT_PRICING.volumeDiscount.tier4.clients) {
        pricePerClient *= (1 - DEXT_PRICING.volumeDiscount.tier4.discount);
    } else if (numClients >= DEXT_PRICING.volumeDiscount.tier3.clients) {
        pricePerClient *= (1 - DEXT_PRICING.volumeDiscount.tier3.discount);
    } else if (numClients >= DEXT_PRICING.volumeDiscount.tier2.clients) {
        pricePerClient *= (1 - DEXT_PRICING.volumeDiscount.tier2.discount);
    }
    
    return numClients * pricePerClient;
}

/**
 * Main calculation function
 */
function calculateROI() {
    const state = calculatorState;
    
    // Calculate total monthly invoices
    const totalInvoicesMonthly = state.numClients * state.invoicesPerClient;
    const totalInvoicesAnnually = totalInvoicesMonthly * 12;
    
    // Time per invoice (minutes)
    const timePerInvoiceWithout = getTotalTimeWithout();
    const timePerInvoiceWith = getTotalTimeWith();
    const timeSavedPerInvoice = timePerInvoiceWithout - timePerInvoiceWith;
    
    // Total time (convert minutes to hours)
    const totalMinutesWithoutMonthly = totalInvoicesMonthly * timePerInvoiceWithout;
    const totalMinutesWithMonthly = totalInvoicesMonthly * timePerInvoiceWith;
    const totalHoursWithoutMonthly = totalMinutesWithoutMonthly / 60;
    const totalHoursWithMonthly = totalMinutesWithMonthly / 60;
    
    // Time saved
    const hoursSavedMonthly = totalHoursWithoutMonthly - totalHoursWithMonthly;
    const hoursSavedAnnually = hoursSavedMonthly * 12;
    
    // Time reduction percentage
    const timeReductionPercent = timePerInvoiceWithout > 0 
        ? ((timePerInvoiceWithout - timePerInvoiceWith) / timePerInvoiceWithout) * 100 
        : 0;
    
    // === COST CALCULATIONS USING ATO METHODOLOGY ===
    // Cost per invoice (AP portion only - 60%)
    const costPerInvoiceWithout = getCostPerInvoiceWithout();  // $16.60
    const costPerInvoiceWith = getCostPerInvoiceWith();        // Dynamic based on time
    
    // Total costs
    const costWithoutMonthly = totalInvoicesMonthly * costPerInvoiceWithout;
    const costWithMonthly = totalInvoicesMonthly * costPerInvoiceWith;
    const costSavingsMonthly = costWithoutMonthly - costWithMonthly;
    const costSavingsAnnually = costSavingsMonthly * 12;
    
    // Dext subscription cost
    const dextMonthlyCost = calculateDextMonthlyCost(state.numClients);
    const dextAnnualCost = dextMonthlyCost * 12;
    
    // Net savings (after Dext subscription)
    const netSavingsMonthly = costSavingsMonthly - dextMonthlyCost;
    const netSavingsAnnually = netSavingsMonthly * 12;
    
    // ROI calculation
    const roiPercent = dextAnnualCost > 0 ? (netSavingsAnnually / dextAnnualCost) * 100 : 0;
    
    // Payback period (in months)
    const paybackMonths = netSavingsMonthly > 0 ? dextMonthlyCost / netSavingsMonthly : 999;
    
    return {
        // Invoice counts
        totalInvoicesMonthly,
        totalInvoicesAnnually,
        
        // Time per invoice (minutes)
        timePerInvoiceWithout,
        timePerInvoiceWith,
        timeSavedPerInvoice,
        
        // Total hours
        totalHoursWithoutMonthly,
        totalHoursWithMonthly,
        hoursSavedMonthly,
        hoursSavedAnnually,
        
        // Percentages
        timeReductionPercent,
        
        // Cost per invoice (ATO-based)
        costPerInvoiceWithout,
        costPerInvoiceWith,
        
        // Total costs
        costWithoutMonthly,
        costWithMonthly,
        costSavingsMonthly,
        costSavingsAnnually,
        
        // Dext costs
        dextMonthlyCost,
        dextAnnualCost,
        
        // Net savings
        netSavingsMonthly,
        netSavingsAnnually,
        
        // ROI
        roiPercent,
        paybackMonths
    };
}

// ========================================
// Formatting Functions
// ========================================

function formatNumber(num) {
    return new Intl.NumberFormat('en-AU').format(Math.round(num));
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

function formatCurrencyDecimal(num) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function formatHours(hours) {
    if (hours < 1) {
        return `${Math.round(hours * 60)} min`;
    } else if (hours < 10) {
        return `${hours.toFixed(1)} hrs`;
    } else {
        return `${Math.round(hours)} hrs`;
    }
}

function formatMinutes(mins) {
    return `${mins} min`;
}

function formatPayback(months) {
    if (months >= 999) {
        return "N/A";
    } else if (months < 1) {
        return `${Math.round(months * 30)} days`;
    } else if (months < 12) {
        return `${months.toFixed(1)} months`;
    } else {
        return `${(months / 12).toFixed(1)} years`;
    }
}

function formatPercent(percent) {
    return `${Math.round(percent)}%`;
}

// ========================================
// Update Display Functions
// ========================================

function updateTimeDisplays() {
    const timeWithout = getTotalTimeWithout();
    const timeWith = getTotalTimeWith();
    
    // Update total time displays in table footer
    if (elements.totalTimeWithout) {
        elements.totalTimeWithout.textContent = timeWithout;
    }
    if (elements.totalTimeWith) {
        elements.totalTimeWith.textContent = timeWith;
    }
    
    // Update ATO formula display
    if (elements.apBaseCost) {
        elements.apBaseCost.textContent = formatCurrencyDecimal(AP_BASE_COST);
    }
    if (elements.timeRatioDisplay) {
        elements.timeRatioDisplay.textContent = `${timeWith}/${timeWithout}`;
    }
    if (elements.dextCostPerInvoice) {
        elements.dextCostPerInvoice.textContent = formatCurrencyDecimal(getCostPerInvoiceWith());
    }
}

function updateResults() {
    const results = calculateROI();
    
    // Update time displays first
    updateTimeDisplays();
    
    // Update invoice counts
    if (elements.totalDocsMonthly) {
        elements.totalDocsMonthly.textContent = formatNumber(results.totalInvoicesMonthly);
    }
    if (elements.totalDocsAnnually) {
        elements.totalDocsAnnually.textContent = formatNumber(results.totalInvoicesAnnually);
    }
    
    // Update time per invoice
    if (elements.timePerInvoiceWithout) {
        elements.timePerInvoiceWithout.textContent = formatMinutes(results.timePerInvoiceWithout);
    }
    if (elements.timePerInvoiceWith) {
        elements.timePerInvoiceWith.textContent = formatMinutes(results.timePerInvoiceWith);
    }
    if (elements.timeSavedPerInvoice) {
        elements.timeSavedPerInvoice.textContent = formatMinutes(results.timeSavedPerInvoice);
    }
    
    // Update monthly processing time
    if (elements.totalTimeWithoutResult) {
        elements.totalTimeWithoutResult.textContent = formatHours(results.totalHoursWithoutMonthly);
    }
    if (elements.totalTimeWithResult) {
        elements.totalTimeWithResult.textContent = formatHours(results.totalHoursWithMonthly);
    }
    if (elements.timeSavedMonthly) {
        elements.timeSavedMonthly.textContent = formatHours(results.hoursSavedMonthly);
    }
    
    // Update annual processing time
    if (elements.totalTimeWithoutAnnual) {
        elements.totalTimeWithoutAnnual.textContent = formatHours(results.totalHoursWithoutMonthly * 12);
    }
    if (elements.totalTimeWithAnnual) {
        elements.totalTimeWithAnnual.textContent = formatHours(results.totalHoursWithMonthly * 12);
    }
    if (elements.timeSavedAnnually) {
        elements.timeSavedAnnually.textContent = formatHours(results.hoursSavedAnnually);
    }
    
    // Update cost per invoice display
    if (elements.costPerInvoiceWithoutDisplay) {
        elements.costPerInvoiceWithoutDisplay.textContent = formatCurrencyDecimal(results.costPerInvoiceWithout);
    }
    if (elements.costPerInvoiceWithDisplay) {
        elements.costPerInvoiceWithDisplay.textContent = formatCurrencyDecimal(results.costPerInvoiceWith);
    }
    if (elements.costSavedPerInvoice) {
        elements.costSavedPerInvoice.textContent = formatCurrencyDecimal(results.costPerInvoiceWithout - results.costPerInvoiceWith);
    }
    
    // Update monthly costs
    if (elements.costWithout) {
        elements.costWithout.textContent = formatCurrency(results.costWithoutMonthly);
    }
    if (elements.costWith) {
        elements.costWith.textContent = formatCurrency(results.costWithMonthly);
    }
    if (elements.costSavingsMonthly) {
        elements.costSavingsMonthly.textContent = formatCurrency(results.costSavingsMonthly);
    }
    
    // Update annual costs
    if (elements.costWithoutAnnually) {
        elements.costWithoutAnnually.textContent = formatCurrency(results.costWithoutMonthly * 12);
    }
    if (elements.costWithAnnually) {
        elements.costWithAnnually.textContent = formatCurrency(results.costWithMonthly * 12);
    }
    if (elements.costSavingsAnnually) {
        elements.costSavingsAnnually.textContent = formatCurrency(results.costSavingsAnnually);
    }
    
    // Update Dext cost
    if (elements.dextCostMonthly) {
        elements.dextCostMonthly.textContent = formatCurrency(results.dextMonthlyCost);
    }
    if (elements.dextCostAnnually) {
        elements.dextCostAnnually.textContent = formatCurrency(results.dextAnnualCost);
    }
    
    // Update net annual savings
    if (elements.annualSavings) {
        elements.annualSavings.textContent = formatCurrency(results.netSavingsAnnually);
    }
    
    // Update ROI
    if (elements.roiPercent) {
        elements.roiPercent.textContent = formatPercent(results.roiPercent);
    }
    if (elements.paybackPeriod) {
        elements.paybackPeriod.textContent = formatPayback(results.paybackMonths);
    }
    
    // Update print report
    updatePrintReport(results);
}

function updatePrintReport(results) {
    const state = calculatorState;
    
    // Set report date
    if (elements.reportDate) {
        elements.reportDate.textContent = new Date().toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Practice profile
    if (elements.reportClients) elements.reportClients.textContent = state.numClients;
    if (elements.reportInvoices) elements.reportInvoices.textContent = state.invoicesPerClient;
    if (elements.reportTimeReduction) elements.reportTimeReduction.textContent = formatPercent(results.timeReductionPercent);
    
    // Calculated savings
    if (elements.reportDocsMonthly) elements.reportDocsMonthly.textContent = formatNumber(results.totalInvoicesMonthly);
    if (elements.reportTimeWithout) elements.reportTimeWithout.textContent = formatHours(results.totalHoursWithoutMonthly);
    if (elements.reportTimeWith) elements.reportTimeWith.textContent = formatHours(results.totalHoursWithMonthly);
    if (elements.reportTimeSaved) elements.reportTimeSaved.textContent = formatHours(results.hoursSavedMonthly);
    if (elements.reportAnnualSavings) elements.reportAnnualSavings.textContent = formatCurrency(results.netSavingsAnnually);
    if (elements.reportErrorSavings) elements.reportErrorSavings.textContent = formatCurrency(results.dextAnnualCost);
    if (elements.reportROI) elements.reportROI.textContent = formatPercent(results.roiPercent);
    if (elements.reportPayback) elements.reportPayback.textContent = formatPayback(results.paybackMonths);
}

// ========================================
// Event Handlers
// ========================================

function syncSliderAndInput(sliderId, inputId, stateKey) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    
    if (!slider || !input) return;
    
    slider.addEventListener('input', function() {
        input.value = this.value;
        calculatorState[stateKey] = parseFloat(this.value);
        updateResults();
    });
    
    input.addEventListener('input', function() {
        let value = parseFloat(this.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        
        if (isNaN(value)) value = min;
        if (value < min) value = min;
        if (value > max) value = max;
        
        slider.value = value;
        this.value = value;
        calculatorState[stateKey] = value;
        updateResults();
    });
}

function syncTimeInput(inputId, stateKey) {
    const input = document.getElementById(inputId);
    
    if (!input) return;
    
    input.addEventListener('input', function() {
        let value = parseFloat(this.value);
        if (isNaN(value) || value < 0) value = 0;
        calculatorState[stateKey] = value;
        updateResults();
    });
    
    input.addEventListener('blur', function() {
        let value = parseFloat(this.value);
        if (isNaN(value) || value < 0) value = 0;
        this.value = value % 1 === 0 ? value : value.toFixed(1);
        calculatorState[stateKey] = value;
    });
}

function initializeEventListeners() {
    // Sync volume sliders with inputs
    syncSliderAndInput('numClients', 'numClientsValue', 'numClients');
    syncSliderAndInput('invoicesPerClient', 'invoicesPerClientValue', 'invoicesPerClient');
    
    // Sync time inputs - Without Dext
    syncTimeInput('timeReceiptWithout', 'timeReceiptWithout');
    syncTimeInput('timeValidationWithout', 'timeValidationWithout');
    syncTimeInput('timeReviewWithout', 'timeReviewWithout');
    syncTimeInput('timeApprovalWithout', 'timeApprovalWithout');
    
    // Sync time inputs - With Dext
    syncTimeInput('timeReceiptWith', 'timeReceiptWith');
    syncTimeInput('timeValidationWith', 'timeValidationWith');
    syncTimeInput('timeReviewWith', 'timeReviewWith');
    syncTimeInput('timeApprovalWith', 'timeApprovalWith');
}

// ========================================
// PDF Generation
// ========================================

function generatePDF() {
    window.print();
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateResults();
});
