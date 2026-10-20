# Castle Statement Studio

A static owner-statement app for GitHub Pages, connected to your own n8n through an authenticated webhook. No build step or npm dependencies. Hostaway credentials stay in n8n. The website never writes to Hostaway.

## Publish on GitHub Pages

1. Commit **the contents of this folder** at your repository root. Include `.github/workflows/pages.yml`, `public`, `n8n`, `tests`, and `package.json`.
2. In GitHub, open **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. Push to `main`, or run **Deploy Statement Studio** from Actions.
4. Open the Pages URL shown by the deployment. The app supports repository subpaths without changes.

Only `public/` is published. Do not commit credentials, guest spreadsheets, or your downloaded draft backups.

## Connect local n8n

1. Import `n8n/statement-studio-data.n8n.json`. This is a **data bridge for this app**, separate from the older standalone statement workflows.
2. On **Statement data**, select a Header Auth credential:
   - Name: `X-Statement-Key`
   - Value: a strong secret of your choice.
3. On **Statement data > Options > Allowed Origins**, enter your Pages origin, such as `https://YOUR-USERNAME.github.io`. Do not include the repository path. For local development, use `http://127.0.0.1:4173`. Multiple origins can be comma separated.
4. Select your Hostaway OAuth2 credential on **Fetch reservation pages** and **Fetch finance**. Use Client Credentials, token URL `https://api.hostaway.com/v1/accessTokens`, account ID as Client ID, API secret as Client Secret, scope `general`, and Authentication `Body`.
5. Publish/activate the workflow. Copy its **Production URL**.
6. In the app, expand **Connect to n8n**. Enter that URL and the Header Auth secret. The secret is kept in memory only; enter it again after reloading.
7. Enter a numeric listing ID and month, then **Fetch reservations**.

GitHub Pages hosts only the website. Requests to n8n come from the user's browser, not from GitHub. For n8n on the same computer, its URL may be `http://localhost:5678/webhook/owner-statement-data`. The browser may ask for local-network access. If HTTPS-to-local HTTP is blocked, use an HTTPS endpoint/reverse proxy for your n8n with valid certificates, or run this app locally. On another computer, localhost refers to that computer, not the computer running n8n. No network exposure or certificate changes are made by this project.

Do not put the Hostaway API secret into the website. The webhook secret is a separate credential. CORS restricts permitted browser origins; it does not replace webhook authentication.

## Use the statement

- Search by listing ID only, then select a month. The bridge fetches stays overlapping that month, including long stays that have not checked out yet. Includes `new` and `modified` reservations, plus `cancelled` reservations with a positive Hostaway payout. Cancelled reservations always have zero Castle-paid and owner-paid cleaning, including linked monthly payments, regardless of cleaning overrides. Newly imported cancelled bookings default to checkout-month recognition even for long scheduled stays; existing recognition choices are preserved. Cancelled bookings with zero, negative, or missing payouts are excluded.
- Stays of 28 nights or longer default to **Monthly payments**. You can change recognition per reservation to Checkout month, Monthly payments, or Exclude.
- Set the management fee method, fee percentage, tax percentage, cleaning tax, base cleaning cost, and cleaning payer. Add dated cleaning changes; they apply **on and after the checkout date**, in date order.
- A blank reservation cleaning override uses the rule. `0` means no cleaning. A booking override can also change the payer and Castle payout share.
- Castle payout share applies to receipts including pass-through tax. The owner receives the remainder. Both sides sum to the original receipt; Castle's share is rounded to cents and the owner receives the cent remainder. Management fees still use the total payout, not Castle's percentage.
- Use **Add entry** for early check-in, late checkout, parking, Airbnb resolutions, claims, actual monthly payments, and other Castle expenses.
- Extras/resolutions can be merged into a reservation/payment row in the same month or displayed separately. Merged entries inherit the target row's payout split; a separate entry can have its own split. All extras/resolutions/claims count toward management fees.
- Claims require check-in and checkout dates, always display `airbnb-claim` highlighted yellow, and always have zero cleaning. Their **entry date**, not their old checkout date, determines the statement month.
- Download **PDF** directly or **CSV**. PDFs retain the approved landscape table layout, repeat headers for long tables, and have no Calculation assumptions or Review Notes. CSV has exact-precision calculations and summary totals; it cannot carry yellow formatting.

### Long stays: actual Airbnb payments

Enter each Airbnb installment with its actual payment date, amount received including pass-through tax, and the pass-through tax for that installment. Select the reservation using Monthly payments. The app includes only installments dated in the selected month, and excludes the reservation's full/lifetime receipt. It does **not** estimate income by dividing the lifetime total or prorating nights.

Cleaning on monthly-payment entries defaults to zero. Enter the actual cleaning cost once on the applicable payment entry, when it belongs in the statement. It is deliberately not repeated automatically on every installment. If no Airbnb payout occurred in a month, use **Confirm no payout this month** for that reservation. Missing entries otherwise block exports.

These dates/amounts are entered manually because the user confirmed they currently live in the spreadsheet and must match Airbnb payouts. Hostaway guest charges are not treated as evidence of Airbnb host disbursements. There is no direct Airbnb account connection or automatic bank reconciliation.

### Reconciliation and extras

For Airbnb, the bridge maps `airbnbPayoutSum` to receipts and `airbnbPassThroughTax` to pass-through tax. The app defaults absent or blank Hostaway pass-through tax to zero when fetching or restoring a draft, preserving explicit user overrides. Missing payout amounts still require explicit entry. Other channels need receipt reconciliation; receipts are not inferred from guest totals. Guest `cleaningFee` is not used as actual cleaning cost.

`reservationExpensesAndExtras` is shown as a reminder when nonzero, but is not automatically added: the aggregate can mix expenses and income. Enter only extras **not already in the receipt**. Do not add the same Airbnb resolution as both a merged extra and a claim. Each entry has its own ID and can be edited or removed.

Explicit receipt/tax overrides are preserved on refetch and reported in a message; unmodified amounts and Hostaway dates still refresh. Recognition and cleaning settings are kept. Use the reservation row's Use latest source amounts button to remove receipt/tax overrides. Deleted/cancelled/out-of-response reservations overlapping the fetched period are removed. Entries linked to a missing reservation produce a visible error rather than silently creating income.

Other Castle expenses use positive pre-tax costs and their own tax rate (13% in the templates). Procurement service fees are entered explicitly; the template label “15%” is not a formula that automatically computes the service fee.

## Workbook formulas verified

The two supplied workbooks each contain one blank `{{Month Year}}` template sheet, not populated monthly history. The app follows their formulas for any selected month:

| Calculation | Gross Platform Payout.xlsx | Net of Cleaning Payout.xlsx |
|---|---|---|
| Platform payout | F20 = I20 + H20 - G20 | Same |
| Fee base | F23 total platform payout | F24 = F22 - K22 - J22 |
| Management fee | F25 = F23 * C25 | F25 = IF(F22=0, F22*C25, (F22-K22-J22)*C25) |
| Management fee tax | F26 = F25 * C26 | Same |
| Fee including tax | F27 = F25 + F26 | Same |
| Castle cleaning with tax | F31 = C31*D31 + (C31*D31)*C26 | J27 = J22 + J22*C26 |
| Castle expense | F35 = SUM(F31:F34) | D13 = J27 + E34 |
| Settlement | Castle receipts - Castle expense - fee incl. tax | Same |

The gross workbook's cleaning unit cost times count is generalized to the sum of actual per-stay costs, allowing dated rate changes. Owner-paid cleaning reduces the net fee base, but is not deducted again from Castle-held money. In gross mode it does not reduce the fee base. Pass-through tax is removed only for platform payout/fee-base calculation, following the supplied workbooks; it is not deducted a second time from settlement.

Calculations use fixed-decimal integers and retain intermediate precision. Display rounds only at the end. Thus displayed rounded subtotals may differ from the rounded settlement by one cent, as in the source workbook. The original September reference still reconciles to 3296.9276238, displayed as CAD 3,296.93.

## Drafts and data

Drafts are stored in this browser under each listing ID; payment entries retain their dates across months. Re-enter a listing ID to reopen its draft. Save a draft backup before clearing browser data or moving devices. Backups include reservation names and amounts but not the webhook secret. Restoring a draft replaces the current workspace. There is no shared database, multi-user synchronization, or automatic server backup.

The demo uses fictional names and a demo listing ID. `?demo=1` opens it directly. Do not submit demo data as a real statement.

## Run locally and test

Requires Node.js 20 or newer:

```sh
npm start
```

Open `http://127.0.0.1:4173`. No install command is needed.

```sh
npm test
```

Tests cover original workbook precision, gross/net formulas, split receipts, dated payer changes, long-stay month selection, merged/separate extras, claims, missing-input failures, PDF structure, and n8n request/pagination handling.

The UI demo and rendered PDF have been inspected. The user's authenticated n8n/Hostaway connection and GitHub deployment have not been executed here. Browser automation could read the app but interaction commands timed out, so end-to-end editing/download clicks have not been fully automated. PDF generation and CSV generation are tested as local functions. The bundled PDF fonts support Latin/Western European characters, including French accents; other scripts may need a font-enabled export extension.

## Official references

- Hostaway API: https://api.hostaway.com/documentation
- n8n Webhook authentication, response and origins: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- GitHub Pages workflow deployment: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
