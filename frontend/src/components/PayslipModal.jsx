/**
 * WorkZen HRMS - Payslip Modal Component
 * Complete payslip view with print capability
 * Matches the format from design requirements
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, Check } from 'lucide-react';
import { useRef } from 'react';

function PayslipModal({ show, payslip, onClose }) {
  const printRef = useRef(null);

  if (!show || !payslip) return null;

  // Extract payroll data
  const payrollData = payslip.fullData || payslip;
  const employee = payrollData.employee || {};
  const earnings = payrollData.earnings || {};
  const deductions = payrollData.deductions || {};
  const attendanceSummary = payrollData.attendanceSummary || {};

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Format period
  const formatPeriod = (payPeriod) => {
    if (!payPeriod) return 'N/A';
    const start = formatDate(payPeriod.startDate);
    const end = formatDate(payPeriod.endDate);
    return `${start} to ${end}`;
  };

  // Calculate totals
  const calculateEarnings = () => {
    const basic = payrollData.basicSalary || 0;
    const hra = earnings.allowances?.hra || 0;
    const conveyance = earnings.allowances?.conveyance || 0;
    const medical = earnings.allowances?.medical || 0;
    const lta = earnings.allowances?.lta || 0;
    const otherAllowances = earnings.allowances?.other || 0;
    const bonus = earnings.bonus || 0;
    const overtime = earnings.overtime?.amount || 0;
    const reimbursements = earnings.reimbursements || 0;

    return {
      basic,
      hra,
      conveyance,
      medical,
      lta,
      other: otherAllowances,
      bonus,
      overtime,
      reimbursements,
      total: basic + hra + conveyance + medical + lta + otherAllowances + bonus + overtime + reimbursements
    };
  };

  const calculateDeductions = () => {
    const pfEmployee = deductions.providentFund?.employee || 0;
    const pfEmployer = deductions.providentFund?.employer || 0;
    const incomeTax = deductions.tax?.incomeTax || 0;
    const professionalTax = deductions.tax?.professionalTax || 0;
    const insurance = deductions.insurance || 0;
    const loan = deductions.loanRepayment || 0;
    const other = deductions.other || 0;

    return {
      pfEmployee,
      pfEmployer,
      incomeTax,
      professionalTax,
      insurance,
      loan,
      other,
      total: pfEmployee + pfEmployer + incomeTax + professionalTax + insurance + loan + other
    };
  };

  const earningsBreakdown = calculateEarnings();
  const deductionsBreakdown = calculateDeductions();
  const grossEarnings = payrollData.grossEarnings || earningsBreakdown.total;
  const totalDeductions = deductionsBreakdown.total;
  const netPay = payrollData.netPay || (grossEarnings - totalDeductions);

  // Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    const WindowPrint = window.open('', '', 'width=900,height=650');
    WindowPrint.document.write(`
      <html>
        <head>
          <title>Payslip - ${employee.name || payslip.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; }
            .payslip-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .company-logo { font-size: 24px; font-weight: bold; color: #005eb8; margin-bottom: 5px; }
            .payslip-title { font-size: 18px; font-weight: bold; color: #00a8e8; margin: 10px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { padding: 5px 0; }
            .info-label { font-size: 12px; color: #666; display: inline-block; width: 140px; }
            .info-value { font-size: 13px; font-weight: 600; color: #000; }
            .section { margin: 20px 0; }
            .section-title { background: #e8b4f7; padding: 8px 15px; font-weight: bold; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; font-size: 12px; }
            td { font-size: 13px; }
            .amount { text-align: right; font-family: monospace; }
            .total-row { background: #b0e0f7; font-weight: bold; }
            .net-pay { background: #b0e0f7; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; border: 2px solid #00a8e8; }
            .note { font-size: 11px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    WindowPrint.document.close();
    WindowPrint.focus();
    setTimeout(() => {
      WindowPrint.print();
      WindowPrint.close();
    }, 250);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border-2 border-gray-800 rounded-xl max-w-4xl w-full my-8"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-800">
            <div>
              <h3 className="text-2xl font-bold text-white">Employee Payslip</h3>
              <p className="text-gray-400 text-sm mt-1">
                Pay Period: {formatPeriod(payrollData.payPeriod)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handlePrint}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </motion.button>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Printable Content */}
          <div ref={printRef} className="px-8 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="payslip-container">
              {/* Header */}
              <div className="header">
                <div className="company-logo">WorkZen</div>
                <div className="payslip-title">Salary slip for month of {new Date(payrollData.payDate || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>

              {/* Employee Info */}
              <div className="info-grid text-white">
                <div className="space-y-2">
                  <div className="info-item">
                    <span className="info-label text-gray-400">Employee name:</span>
                    <span className="info-value text-white">{employee.name || payslip.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Employee Code:</span>
                    <span className="info-value text-white">{employee.employeeId || employee.userId || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Department:</span>
                    <span className="info-value text-white">{employee.department || payslip.department || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Location:</span>
                    <span className="info-value text-white">{employee.location || 'Head Office'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Date of joining:</span>
                    <span className="info-value text-white">{formatDate(employee.joinDate)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="info-item">
                    <span className="info-label text-gray-400">PAN:</span>
                    <span className="info-value text-white">{payrollData.taxDetails?.panNumber || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">UAN:</span>
                    <span className="info-value text-white">{employee.uan || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Bank A/c NO.:</span>
                    <span className="info-value text-white">{payrollData.bankDetails?.accountNumber || employee.bankAccountNumber || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Pay period:</span>
                    <span className="info-value text-white">{formatPeriod(payrollData.payPeriod)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label text-gray-400">Pay date:</span>
                    <span className="info-value text-white">{formatDate(payrollData.payDate)}</span>
                  </div>
                </div>
              </div>

              {/* Worked Days Section */}
              <div className="section">
                <div className="section-title bg-purple-200 text-black">Worked Days</div>
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between text-white">
                    <div>
                      <p className="text-gray-400 text-sm">Attendance</p>
                      <p className="text-xl font-bold">{attendanceSummary.presentDays || 20} Days</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total</p>
                      <p className="text-xl font-bold">{attendanceSummary.totalDays || 22} Days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Earnings and Deductions Table */}
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="section">
                  <div className="section-title bg-purple-200 text-black">Earnings</div>
                  <table className="w-full text-white">
                    <thead>
                      <tr>
                        <th className="text-left bg-gray-800">Rule Name</th>
                        <th className="text-right bg-gray-800">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr><td>Basic Salary</td><td className="amount text-green-400">₹ {earningsBreakdown.basic.toFixed(2)}</td></tr>
                      {earningsBreakdown.hra > 0 && <tr><td>House Rent Allowance</td><td className="amount text-green-400">₹ {earningsBreakdown.hra.toFixed(2)}</td></tr>}
                      {earningsBreakdown.conveyance > 0 && <tr><td>Conveyance Allowance</td><td className="amount text-green-400">₹ {earningsBreakdown.conveyance.toFixed(2)}</td></tr>}
                      {earningsBreakdown.medical > 0 && <tr><td>Medical Allowance</td><td className="amount text-green-400">₹ {earningsBreakdown.medical.toFixed(2)}</td></tr>}
                      {earningsBreakdown.lta > 0 && <tr><td>Leave Travel Allowance</td><td className="amount text-green-400">₹ {earningsBreakdown.lta.toFixed(2)}</td></tr>}
                      {earningsBreakdown.bonus > 0 && <tr><td>Performance Bonus</td><td className="amount text-green-400">₹ {earningsBreakdown.bonus.toFixed(2)}</td></tr>}
                      {earningsBreakdown.overtime > 0 && <tr><td>Overtime Pay</td><td className="amount text-green-400">₹ {earningsBreakdown.overtime.toFixed(2)}</td></tr>}
                      {earningsBreakdown.other > 0 && <tr><td>Other Allowances</td><td className="amount text-green-400">₹ {earningsBreakdown.other.toFixed(2)}</td></tr>}
                      <tr className="total-row bg-gray-700 font-bold">
                        <td>Gross</td>
                        <td className="amount text-green-400">₹ {grossEarnings.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div className="section">
                  <div className="section-title bg-purple-200 text-black">Deductions</div>
                  <table className="w-full text-white">
                    <thead>
                      <tr>
                        <th className="text-left bg-gray-800">Rule Name</th>
                        <th className="text-right bg-gray-800">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {deductionsBreakdown.pfEmployee > 0 && <tr><td>PF Employee</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.pfEmployee.toFixed(2)}</td></tr>}
                      {deductionsBreakdown.pfEmployer > 0 && <tr><td>PF Employer</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.pfEmployer.toFixed(2)}</td></tr>}
                      {deductionsBreakdown.incomeTax > 0 && <tr><td>Income Tax</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.incomeTax.toFixed(2)}</td></tr>}
                      {deductionsBreakdown.professionalTax > 0 && <tr><td>Professional Tax</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.professionalTax.toFixed(2)}</td></tr>}
                      {deductionsBreakdown.insurance > 0 && <tr><td>Insurance</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.insurance.toFixed(2)}</td></tr>}
                      {deductionsBreakdown.loan > 0 && <tr><td>Loan Repayment</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.loan.toFixed(2)}</td></tr>}
                      {deductionsBreakdown.other > 0 && <tr><td>Other Deductions</td><td className="amount text-red-400">- ₹ {deductionsBreakdown.other.toFixed(2)}</td></tr>}
                      {totalDeductions === 0 && <tr><td colSpan="2" className="text-center text-gray-500">No deductions</td></tr>}
                      <tr className="total-row bg-gray-700 font-bold">
                        <td>Total Deductions</td>
                        <td className="amount text-red-400">- ₹ {totalDeductions.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Pay */}
              <div className="net-pay bg-blue-100 text-black border-2 border-blue-500 rounded-lg mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Total Net Payable (Gross Earning - Total deductions)</span>
                  <span className="text-2xl font-bold text-blue-600">₹ {netPay.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">[Amount in words] only</p>
              </div>

              {/* Note */}
              <div className="note text-gray-400">
                <p>Salary is calculated based on the employee's monthly attendance. Paid leaves are included in the total payable days, while unpaid leaves are deducted from the salary.</p>
                <p className="mt-2">This is a system-generated payslip and does not require a signature.</p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 px-8 py-6 border-t border-gray-800">
            <motion.button
              onClick={handlePrint}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print Payslip
            </motion.button>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PayslipModal;
