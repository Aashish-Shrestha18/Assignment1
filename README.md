# Right Drive Automotive – Complaint Booking Web Application

Full-stack complaint form built with Node.js, Express, Handlebars, express-validator, multer and helmet.

## Run locally
```bash
npm install
npm start
# open http://localhost:3000
```
Requires Node 18+.

## Features
| Requirement | Where |
|---|---|
| HTML5/CSS3 form | `views/index.hbs`, `public/css/style.css` |
| Client-side validation (JS) | `public/js/validate.js` |
| Express server + POST endpoint | `server.js` → `POST /complaints` |
| Server-side validation (express-validator) | `complaintRules` in `server.js` |
| helmet security headers | `app.use(helmet())` in `server.js` |
| Image upload | multer, stored in `/uploads` (JPG/PNG/GIF/WebP, ≤5 MB, ≤5 files) |
| Redirect + display page | `303 → GET /complaints/:id` → `views/complaint.hbs` |
| Custom Handlebars helper | `reviewDate` in `helpers.js` (adds 3 business days) |

## Notes
- Complaints are saved to `data/complaints.json` (no database required).
- Handlebars `{{ }}` escapes all user input; the description helper `nl2br` escapes before adding line breaks.
- Uploaded files get random server-generated names, and the MIME type is checked before saving.
