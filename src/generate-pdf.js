const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function generateInvoice() {
    const [,, year, month, clientKey, seq, customHoursStr, itemsStr] = process.argv;

    if (!year || !month || !clientKey) {
        console.error('Usage: node generate-pdf.js <year> <month> <client> [seq] [customHours] [items]');
        process.exit(1);
    }

    const config = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'config.json'), 'utf8'));
    const client = config.clients[clientKey];
    const myCompany = config.myCompany;

    if (!client) {
        console.error(`Client with key '${clientKey}' not found in config.json`);
        process.exit(1);
    }

    const invoiceNumber = `${client.prefix}-${year}${String(month).padStart(2, '0')}-${String(seq || 1).padStart(2, '0')}`;

    const customHours = (customHoursStr || '').split(',').reduce((acc, item) => {
        if (item) {
            const [date, hours] = item.split(':');
            acc[date] = parseFloat(hours);
        }
        return acc;
    }, {});

    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    const monthYear = `${monthName} ${year}`;

    let calendarBody = '';
    let totalHours = 0;

    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    let day = 1;
    for (let i = 0; i < 6; i++) {
        calendarBody += '<tr>';
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < firstDay) {
                calendarBody += '<td></td>';
            } else if (day > daysInMonth) {
                calendarBody += '<td></td>';
            } else {
                const currentDate = new Date(year, month - 1, day);
                const dayOfWeek = currentDate.getDay();
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                    const hours = dateStr in customHours ? customHours[dateStr] : 8;
                    totalHours += hours;
                    calendarBody += `<td><div class="day">${day}</div><div class="hours">${hours}h</div></td>`;
                } else {
                    calendarBody += `<td class="weekend"><div class="day">${day}</div></td>`;
                }
                day++;
            }
        }
        calendarBody += '</tr>';
        if (day > daysInMonth) {
            break;
        }
    }

    const rate = client.rate || 50;
    let totalAmount = 0;
    let invoiceItems = '';

    if (itemsStr) {
        const items = itemsStr.split(',').map(item => {
            const [description, hours] = item.split(':');
            return { description, hours: parseFloat(hours) };
        });

        items.forEach(item => {
            const amount = item.hours * rate;
            totalAmount += amount;
            invoiceItems += `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.hours}</td>
                    <td>€${rate.toFixed(2)}</td>
                    <td>€${amount.toFixed(2)}</td>
                </tr>`;
        });
    } else {
        totalAmount = totalHours * rate;
        invoiceItems = `
            <tr>
                <td>Development services for ${monthYear}</td>
                <td>${totalHours}</td>
                <td>€${rate.toFixed(2)}</td>
                <td>€${totalAmount.toFixed(2)}</td>
            </tr>`;
    }

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 14);

    const activeBankAccounts = myCompany.bankAccounts.filter(acc => acc.active);
    let paymentInstructions = '';

    if (activeBankAccounts.length === 1) {
        const bank = activeBankAccounts[0];
        paymentInstructions = `
            <p>
                Please make payment to the following bank account:<br>
                <strong>Bank:</strong> ${bank.name}<br>
                <strong>Account Name:</strong> ${bank.accountName}<br>
                <strong>Account Number:</strong> ${bank.accountNumber}<br>
                <strong>IBAN:</strong> ${bank.iban}<br>
                <strong>SWIFT/BIC:</strong> ${bank.swift}
            </p>`;
    } else if (activeBankAccounts.length === 2) {
        paymentInstructions = '<p>Please make payment to one of the following bank accounts:</p>';
        paymentInstructions += '<div class="two-column-layout">';
        activeBankAccounts.forEach(bank => {
            paymentInstructions += `
                <div class="bank-card">
                    <strong>Bank:</strong> ${bank.name}<br>
                    <strong>Account Name:</strong> ${bank.accountName}<br>
                    <strong>Account Number:</strong> ${bank.accountNumber}<br>
                    <strong>IBAN:</strong> ${bank.iban}<br>
                    <strong>SWIFT/BIC:</strong> ${bank.swift}
                </div>`;
        });
        paymentInstructions += '</div>';
    } else if (activeBankAccounts.length > 2) {
        paymentInstructions = '<p>Please make payment to one of the following bank accounts:</p>';
        activeBankAccounts.forEach(bank => {
            paymentInstructions += `
                <div class="bank-details">
                    <strong>Bank:</strong> ${bank.name}<br>
                    <strong>Account Name:</strong> ${bank.accountName}<br>
                    <strong>Account Number:</strong> ${bank.accountNumber}<br>
                    <strong>IBAN:</strong> ${bank.iban}<br>
                    <strong>SWIFT/BIC:</strong> ${bank.swift}
                </div>`;
        });
    }

    let html = await fs.readFile(path.join(__dirname, 'invoice.html'), 'utf8');

    html = html.replace('{{paymentInstructions}}', paymentInstructions);
    html = html.replace('{{invoiceNumber}}', invoiceNumber);
    html = html.replace('{{date}}', today.toLocaleDateString());
    html = html.replace('{{dueDate}}', dueDate.toLocaleDateString());
    html = html.replace('{{myCompanyName}}', myCompany.name);
    html = html.replace('{{myCompanyAddress}}', myCompany.address);
    html = html.replace(/{{myCompanyEmail}}/g, myCompany.email);
    html = html.replace('{{myCompanyNif}}', myCompany.nif);
    html = html.replace('{{myCompanyStat}}', myCompany.stat);
    html = html.replace('{{clientName}}', client.name);
    html = html.replace('{{clientAddress}}', client.address);
    html = html.replace('{{clientEmail}}', client.email);
    
    // Handle attention line
    const attentionToLine = client.attentionTo ? `<em>Attn: ${client.attentionTo}</em><br>` : '';
    html = html.replace('{{attentionToLine}}', attentionToLine);
    html = html.replace(/{{monthYear}}/g, monthYear);
    html = html.replace('{{calendarBody}}', calendarBody);
    html = html.replace('{{invoiceItems}}', invoiceItems);
    html = html.replace('{{totalAmount}}', totalAmount.toFixed(2));

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ path: path.join(__dirname, 'style.css') });

    const pdfPath = path.join(__dirname, '..', 'dist', `invoice-${invoiceNumber}.pdf`);
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true
    });

    const htmlPath = path.join(__dirname, '..', 'dist', `index.html`);
    await fs.copyFile(path.join(__dirname, 'style.css'), path.join(__dirname, '..', 'dist', 'style.css'));
    await fs.writeFile(htmlPath, html);

    await browser.close();

    console.log(`Invoice generated at ${pdfPath}`);
    console.log(`Compiled HTML saved at ${htmlPath}`);
}

generateInvoice();
