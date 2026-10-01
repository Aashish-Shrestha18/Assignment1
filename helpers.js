'use strict';
const Handlebars = require('handlebars');

/**
 * CUSTOM HELPER: {{reviewDate submittedAt 3}}
 * Adds N business days (skips Saturday/Sunday) to the submission date and
 * returns e.g. "Tuesday, October 6, 2026".
 */
function reviewDate(isoDate, businessDays) {
  const days = Number.isInteger(businessDays) ? businessDays : 3;
  const d = new Date(isoDate);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** {{formatDate submittedAt}} -> "September 30, 2026, 2:15 p.m." */
function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' });
}

/** {{nl2br text}} -> escapes HTML, then converts line breaks to <br> */
function nl2br(text) {
  const safe = Handlebars.Utils.escapeExpression(text || '');
  return new Handlebars.SafeString(safe.replace(/\r?\n/g, '<br>'));
}

/** {{fileSize bytes}} -> "1.2 MB" */
function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** {{#if (gt images.length 0)}} */
const gt = (a, b) => a > b;

module.exports = { reviewDate, formatDate, nl2br, fileSize, gt };
