# Invoice Generator

This is a simple project that uses web technologies (HTML, CSS, and Node.js) to generate PDF invoices. It includes a timesheet calendar that can be customized for each month.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/)
*   [npm](https://www.npmjs.com/)
*   `make`

## Usage

1.  **Install dependencies:**

    ```bash
    make install
    ```

2.  **Generate an invoice:**

    To generate an invoice for the current month and year, run:

    ```bash
    make invoice
    ```

    To generate an invoice for a specific month and year, use the `YEAR` and `MONTH` variables:

    ```bash
    make invoice YEAR=2025 MONTH=7
    ```

3.  **Customize hours (optional):**

    To specify custom hours for certain days, use the `CUSTOM_HOURS` variable. The format is a comma-separated list of `YYYY-MM-DD:hours`.

    ```bash
    make invoice YEAR=2025 MONTH=7 CUSTOM_HOURS="2025-07-10:4,2025-07-15:6"
    ```

4.  **Generate an invoice with specific line items (optional):**

    To generate an invoice with a detailed list of services, use the `ITEMS` variable. The format is a comma-separated list of `"Description:hours"`.

    ```bash
    make invoice CLIENT=ACME YEAR=2025 MONTH=7 ITEMS="Feature A:10,Feature B:20"
    ```

    If the `ITEMS` variable is not provided, the invoice will show a single line item for the total hours from the timesheet.

    The generated PDF will be saved in the `dist` directory.

## Customization

*   **Invoice Content:** You can edit `src/invoice.html` to change the invoice layout, add your personal details, or update the payment instructions.
*   **Styling:** You can modify `src/style.css` to change the appearance of the invoice.
