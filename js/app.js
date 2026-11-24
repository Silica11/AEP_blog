let articlesData = [];
const CACHE_KEY = "aep_site_data_v1";

// Cambio sezione nel menu
function showSection(sectionId, btn) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + sectionId).classList.add('active');
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Formattazione **grassetto** e *corsivo*
function parseMarkdown(text) {
  if (!text) return "";
  let safe = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return safe;
}

// Estrae URL pulito per carosello Instagram (CON LO SLASH / CORRETTO)
function getInstagramEmbedUrl(postUrl) {
  if (!postUrl) return null;
  const cleanStr = String(postUrl).split('?').at(0);
  const parts = cleanStr.split('/');
  const typeIndex = parts.findIndex(p => p === 'p' || p === 'reel');
  if (typeIndex !== -1 && parts.at(typeIndex + 1)) {
    return 'https://instagram.com' + parts.at(typeIndex) + '/' + parts.at(typeIndex + 1) + '/embed/';
  }
  return null;
}

// Converte link file Google Drive in immagine visibile ad alta risoluzione
function formatDriveImage(url) {
  if (!url) return "";
  const str = String(url).trim();
  if (str.includes('://google.com') && !str.includes('/folders/')) {
    const match = str.match(/[-\w]{25,}/);
    if (match) {
      return 'https://://google.com/thumbnail?id=' + match.at(0) + '&sz=w1200';
    }
  }
  return str;
}

// Funzione che disegna tutti i dati sulla pagina
function renderSiteData(data) {
  if (!data) return;

  // 1. Popola HOME
  const home = Array.isArray(data.home) ? data.home.at(0) : data.home;
  if (home) {
    const title = home.Project_Name || home.Nome_Progetto;
    const igUrl = home.Instagram_URL || home.Link_Instagram;
    if (title) {
      document.getElementById('project-name').textContent = String(title).trim();
      document.title = String(title).trim();
    }
    if (home.Tagline) document.getElementById('project-tagline').textContent = home.Tagline;
    if (igUrl && String(igUrl).trim() !== "") {
      document.getElementById('ig-profile-link').href = String(igUrl).trim();
    }
    if (home.About_Text) {
      document.getElementById('about-box').style.display = 'block';
      document.getElementById('about-text').innerHTML = parseMarkdown(home.About_Text);
    }
    if (home.Join_Text) document.getElementById('join-text').innerHTML = parseMarkdown(home.Join_Text);
    if (home.Email) document.getElementById('contact-email-box').textContent = "Email: " + home.Email;
  }

  // 2. Popola BLOG / FIELD DIARY
  articlesData = data.blog || data.articoli || [];
  const blogContainer = document.getElementById('articles-container');
  if (articlesData.length > 0) {
    blogContainer.innerHTML = articlesData.map((art, index) => `
      <article class="article-card" onclick="openArticle(${index})">
        <div class="time-badge">${art.Badge_Time || art.Badge_Tempo || 'DIARY'}</div>
        <div class="card-content">
          <div>
            <div class="card-date">${art.Date || art.Data || ''}</div>
            <h3 class="card-title">${art.Title || art.Titolo || ''}</h3>
            <p class="card-preview">${art.Preview || art.Anteprima || ''}</p>
          </div>
          <span class="read-more">Read more →</span>
        </div>
      </article>
    `).join('');
  } else {
    blogContainer.innerHTML = '<div class="empty-state">No field diary entries published yet.</div>';
  }

  // 3. Popola PROGETTI / SITI
  const projects = data.projects || [];
  if (projects.length > 0) {
    document.getElementById('projects-container').innerHTML = projects.map(p => `
      <div class="grid-item">
        ${p.Image_URL ? `<img src="${formatDriveImage(p.Image_URL)}" alt="${p.Site_Name || ''}">` : ''}
        <div class="grid-item-body">
          ${p.Period ? `<span class="badge-pill">${p.Period}</span>` : ''}
          <h3 class="card-title">${p.Site_Name || ''}</h3>
          <div class="card-date" style="margin-bottom:8px;">${p.Location || ''}</div>
          <p style="font-size:0.9rem; color:var(--slate-mid);">${p.Description || ''}</p>
        </div>
      </div>
    `).join('');
  }

  // 4. Popola PUBBLICAZIONI
  const pubs = data.publications || [];
  if (pubs.length > 0) {
    document.getElementById('publications-container').innerHTML = pubs.map(pub => `
      <div class="content-box" style="margin-bottom:0;">
        <span class="badge-pill">${pub.Year || ''}</span>
        <h3 class="card-title">${pub.Title || ''}</h3>
        <p class="card-date" style="margin-bottom:8px;">${pub.Authors || ''} — <em>${pub.Journal_Or_Book || ''}</em></p>
        ${pub.Drive_PDF_URL ? `<a href="${pub.Drive_PDF_URL}" target="_blank" class="read-more" style="text-decoration:none;">Download / View PDF →</a>` : ''}
      </div>
    `).join('');
  }

  // 5. Popola PORTFOLIO
  const portfolio = data.portfolio || [];
  if (portfolio.length > 0) {
    document.getElementById('portfolio-container').innerHTML = portfolio.map(item => `
      <div class="grid-item">
        ${item.Image_URL ? `<img src="${formatDriveImage(item.Image_URL)}" alt="${item.Title || ''}">` : ''}
        <div class="grid-item-body">
          <h3 class="card-title">${item.Title || ''}</h3>
          <p style="font-size:0.85rem; color:var(--slate-mid);">${item.Caption || ''}</p>
        </div>
      </div>
    `).join('');
  }
}

// Carica subito dalla cache se disponibile (0ms di attesa!)
const cachedData = localStorage.getItem(CACHE_KEY);
if (cachedData) {
  try {
    renderSiteData(JSON.parse(cachedData));
  } catch (e) {}
}

// Scarica i dati aggiornati da Google Sheets in background
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    renderSiteData(data);
  });

// Apre singolo articolo del Field Diary
function openArticle(index) {
  const art = articlesData.at(index);
  if (!art) return;

  document.getElementById('sheet-badge').textContent = art.Badge_Time || art.Badge_Tempo || 'DIARY';
  document.getElementById('sheet-date').textContent = art.Date || art.Data || '';
  document.getElementById('sheet-title').textContent = art.Title || art.Titolo || '';
  document.getElementById('sheet-content').innerHTML = parseMarkdown(art.Full_Text || art.Testo_Completo);

  const igContainer = document.getElementById('sheet-ig-container');
  const embedUrl = getInstagramEmbedUrl(art.Instagram_Post_URL || art.Link_Post_Instagram);

  if (embedUrl) {
    igContainer.style.display = 'flex';
    igContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`;
  } else {
    igContainer.style.display = 'none';
    igContainer.innerHTML = '';
  }

  document.getElementById('sheet-scroll-body').scrollTop = 0;
  document.getElementById('sheet-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeArticle() {
  document.getElementById('sheet-overlay').classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => {
    document.getElementById('sheet-ig-container').innerHTML = '';
  }, 350);
}
