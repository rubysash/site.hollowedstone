// Feedback modal -- shared across all pages
// Submit bug reports or game suggestions

let _initialized = false;
let _gameCode = null;
let _overlay = null;
let _captchaA = 0, _captchaB = 0;

export function initFeedback(opts = {}) {
  _gameCode = opts.gameCode || null;
  _initialized = true;
}

export function openFeedback() {
  if (!_initialized) initFeedback();
  showChoiceScreen();
}

function showChoiceScreen() {
  closeOverlay();
  _overlay = document.createElement('div');
  _overlay.id = 'feedback-overlay';
  _overlay.innerHTML = `
    <div class="fb-backdrop" onclick="document.getElementById('feedback-overlay')?.remove()"></div>
    <div class="fb-panel">
      <div class="fb-header">
        <h2>Feedback</h2>
        <button class="fb-close" onclick="document.getElementById('feedback-overlay')?.remove()">&times;</button>
      </div>
      <div class="fb-body">
        <p class="fb-disclaimer">This isn't a comment form. Your information will not be displayed, ever. We appreciate you pointing out bugs though.</p>
        <div class="fb-choices">
          <button class="fb-btn" id="fb-choose-bug">Submit a Bug</button>
          <button class="fb-btn fb-btn-alt" id="fb-choose-suggest">Suggest a Game</button>
          <button class="fb-btn fb-btn-alt" id="fb-choose-sponsor">Become a Sponsor</button>
        </div>
      </div>
    </div>
  `;
  injectStyles();
  document.body.appendChild(_overlay);
  document.getElementById('fb-choose-bug').addEventListener('click', () => showForm('bug'));
  document.getElementById('fb-choose-suggest').addEventListener('click', () => showForm('suggestion'));
  document.getElementById('fb-choose-sponsor').addEventListener('click', () => showForm('sponsor'));
}

function showForm(type) {
  _captchaA = Math.floor(Math.random() * 9) + 1;
  _captchaB = Math.floor(Math.random() * 9) + 1;

  const isBug = type === 'bug';
  const isSponsor = type === 'sponsor';
  const titleLabel = isBug ? 'Bug Title' : isSponsor ? 'Your Name or Organization' : 'Game Title';
  const descLabel = isBug ? 'Description' : isSponsor ? 'Tell us about yourself (optional)' : 'Rules / Summary';
  const descPlaceholder = isBug ? 'What happened? What did you expect?'
    : isSponsor ? 'What you do, why you want to sponsor, or anything you want us to know.'
    : 'How is the game played? Key rules and mechanics.';
  const titlePlaceholder = isBug ? 'Short summary of the issue'
    : isSponsor ? 'e.g. Acme Board Games, Jane Smith, Local Chess Club'
    : 'Name of the game';
  const disclaimer = isSponsor
    ? 'Sponsors are listed on our <a href="/partners" style="color:#b388ff;">Partners</a> page with a link to your site. We review all submissions before publishing. Sponsorship starts at $5/month.'
    : "This isn't a comment form. Your information will not be displayed, ever. We appreciate you pointing out bugs though.";
  const gameCodeField = isBug ? `
    <label class="fb-label">Game Code (optional)</label>
    <input type="text" id="fb-gamecode" maxlength="6" class="fb-input fb-input-mono" value="${_gameCode || ''}" placeholder="e.g. ABC123">
  ` : '';
  const sponsorFields = isSponsor ? `
    <label class="fb-label">Website URL</label>
    <input type="url" id="fb-website" maxlength="200" class="fb-input" placeholder="https://yoursite.com">
  ` : '';

  const panel = _overlay.querySelector('.fb-panel');
  panel.querySelector('.fb-body').innerHTML = `
    <button class="fb-back" id="fb-back">&larr; Back</button>
    <p class="fb-disclaimer">${disclaimer}</p>
    <form id="fb-form" autocomplete="off">
      <input type="hidden" id="fb-type" value="${type}">
      <label class="fb-label">${titleLabel} <span class="fb-req">*</span></label>
      <input type="text" id="fb-title" maxlength="100" class="fb-input" required placeholder="${titlePlaceholder}">
      ${sponsorFields}
      <label class="fb-label">${descLabel}${isSponsor ? '' : ' <span class="fb-req">*</span>'}</label>
      <textarea id="fb-desc" maxlength="2000" class="fb-textarea" ${isSponsor ? '' : 'required'} placeholder="${descPlaceholder}">${''}</textarea>
      <span class="fb-charcount" id="fb-charcount">0 / 2000</span>
      ${gameCodeField}
      <div class="fb-contact-section">
        <label class="fb-label">Email (optional)</label>
        <input type="email" id="fb-email" maxlength="100" class="fb-input" placeholder="you@example.com">
        <label class="fb-label">Phone (optional)</label>
        <input type="tel" id="fb-phone" maxlength="15" class="fb-input" placeholder="555-123-4567">
        <label class="fb-checkbox-label">
          <input type="checkbox" id="fb-contact"> OK to contact me about this
        </label>
      </div>
      <div class="fb-captcha">
        <label class="fb-label">What is ${_captchaA} + ${_captchaB}? <span class="fb-req">*</span></label>
        <input type="number" id="fb-captcha" class="fb-input fb-input-short" required>
      </div>
      <div class="fb-error" id="fb-error"></div>
      <button type="submit" class="fb-btn fb-submit">Submit</button>
    </form>
  `;

  document.getElementById('fb-back').addEventListener('click', showChoiceScreen);

  const desc = document.getElementById('fb-desc');
  const charcount = document.getElementById('fb-charcount');
  desc.addEventListener('input', () => {
    charcount.textContent = `${desc.value.length} / 2000`;
  });

  // Auto-check contact when email/phone typed
  const email = document.getElementById('fb-email');
  const phone = document.getElementById('fb-phone');
  const contact = document.getElementById('fb-contact');
  const autoCheck = () => {
    if (email.value.trim() || phone.value.trim()) {
      contact.checked = true;
    }
  };
  email.addEventListener('input', autoCheck);
  phone.addEventListener('input', autoCheck);

  document.getElementById('fb-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm();
  });
}

async function submitForm() {
  const errEl = document.getElementById('fb-error');
  errEl.textContent = '';

  const type = document.getElementById('fb-type').value;
  const title = document.getElementById('fb-title').value.trim();
  const desc = document.getElementById('fb-desc').value.trim();
  const email = document.getElementById('fb-email')?.value.trim() || '';
  const phone = document.getElementById('fb-phone')?.value.trim() || '';
  const contact = document.getElementById('fb-contact')?.checked || false;
  const captcha = parseInt(document.getElementById('fb-captcha').value, 10);
  const gameCode = document.getElementById('fb-gamecode')?.value.trim().toUpperCase() || '';
  const website = document.getElementById('fb-website')?.value.trim() || '';

  // Validate
  if (!title) { errEl.textContent = 'Title is required.'; return; }
  if (title.length > 100) { errEl.textContent = 'Title too long (100 max).'; return; }
  if (type !== 'sponsor' && !desc) { errEl.textContent = 'Description is required.'; return; }
  if (desc.length > 2000) { errEl.textContent = 'Description too long (2000 max).'; return; }
  if (type === 'sponsor' && !email) { errEl.textContent = 'Email is required for sponsor inquiries.'; return; }
  if (email.length > 100) { errEl.textContent = 'Email too long.'; return; }
  if (phone.length > 15) { errEl.textContent = 'Phone too long.'; return; }
  if (website.length > 200) { errEl.textContent = 'Website URL too long.'; return; }
  if (captcha !== _captchaA + _captchaB) { errEl.textContent = 'Math answer is incorrect.'; return; }

  const body = { type, title, description: desc, gameCode, email, phone, contact, website };

  const submitBtn = document.querySelector('.fb-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const resp = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();

    if (resp.status === 429) {
      errEl.textContent = data.error || "You've submitted the maximum feedback for now. Please try again later.";
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      return;
    }

    if (!resp.ok) {
      errEl.textContent = data.error || 'Something went wrong.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      return;
    }

    // Success
    const panel = _overlay.querySelector('.fb-body');
    panel.innerHTML = '<p class="fb-success">Thank you! Your feedback has been submitted.</p>';
    setTimeout(closeOverlay, 2000);
  } catch (e) {
    errEl.textContent = 'Network error. Please try again.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

function closeOverlay() {
  if (_overlay) { _overlay.remove(); _overlay = null; }
}

function injectStyles() {
  if (document.getElementById('fb-styles')) return;
  const style = document.createElement('style');
  style.id = 'fb-styles';
  style.textContent = `
    #feedback-overlay { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; }
    .fb-backdrop { position:absolute; inset:0; background:rgba(0,0,0,0.85); }
    .fb-panel { position:relative; background:#161b22; border:1px solid #6a0dad; border-radius:12px; max-width:500px; width:95vw; max-height:90vh; display:flex; flex-direction:column; z-index:1; }
    .fb-header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid #30363d; }
    .fb-header h2 { font-size:1.2rem; letter-spacing:0.1em; color:#c9d1d9; margin:0; }
    .fb-close { background:none; border:none; color:#7a8599; font-size:1.5rem; cursor:pointer; }
    .fb-body { padding:1rem 1.5rem; overflow-y:auto; }
    .fb-disclaimer { font-size:0.8rem; color:#7a8599; margin-bottom:1rem; font-style:italic; }
    .fb-choices { display:flex; gap:1rem; justify-content:center; margin-top:1rem; }
    .fb-btn { background:#6a0dad; color:#fff; border:none; padding:0.7rem 1.5rem; font-family:inherit; font-size:0.95rem; border-radius:6px; cursor:pointer; letter-spacing:0.05em; transition:background 0.2s; }
    .fb-btn:hover { background:#7b1fa2; }
    .fb-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .fb-btn-alt { background:transparent; border:1px solid #6a0dad; color:#b388ff; }
    .fb-btn-alt:hover { background:rgba(106,13,173,0.15); }
    .fb-back { background:none; border:none; color:#b388ff; font-size:0.85rem; cursor:pointer; margin-bottom:0.8rem; padding:0; }
    .fb-back:hover { text-decoration:underline; }
    .fb-label { display:block; font-size:0.8rem; color:#7a8599; margin-top:0.8rem; margin-bottom:0.2rem; }
    .fb-req { color:#f85149; }
    .fb-input { width:100%; padding:0.5rem 0.7rem; background:#0d1117; border:1px solid #30363d; border-radius:4px; color:#c9d1d9; font-family:inherit; font-size:0.9rem; }
    .fb-input:focus { outline:none; border-color:#6a0dad; }
    .fb-input-mono { font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace; letter-spacing:0.15em; text-transform:uppercase; }
    .fb-input-short { max-width:120px; }
    .fb-textarea { width:100%; min-height:100px; padding:0.5rem 0.7rem; background:#0d1117; border:1px solid #30363d; border-radius:4px; color:#c9d1d9; font-family:inherit; font-size:0.9rem; resize:vertical; }
    .fb-textarea:focus { outline:none; border-color:#6a0dad; }
    .fb-charcount { font-size:0.7rem; color:#7a8599; display:block; text-align:right; }
    .fb-contact-section { margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #21262d; }
    .fb-checkbox-label { display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:#c9d1d9; margin-top:0.5rem; cursor:pointer; }
    .fb-captcha { margin-top:0.8rem; }
    .fb-error { color:#f85149; font-size:0.85rem; margin-top:0.5rem; min-height:1.2em; }
    .fb-submit { width:100%; margin-top:1rem; }
    .fb-success { color:#4ade80; text-align:center; padding:2rem 0; font-size:1.1rem; }
  `;
  document.head.appendChild(style);
}
