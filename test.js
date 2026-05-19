
  // Bug fix: 'clerk' must never be a stale null captured at parse time.
  // Use a live getter so it always reflects window.Clerk, which is set by the deferred script.
  var clerkLoaded = false;
  var clerkUserButtonMounted = false;
  Object.defineProperty(window, 'clerk', {
    get: function() { return window.Clerk || null; },
    configurable: true
  });

  // Bug fix: Wire Clerk's ready callback so updateAuthUI() is called after login.
  // The Clerk SDK sets window.__clerk_loaded = true and fires this function when ready.
  window.__clerk_loaded = function() {
    clerkLoaded = true;
    if (window.Clerk) {
      window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } }).then(function() {
        updateAuthUI();
        window.Clerk.addListener(function() { updateAuthUI(); });
      }).catch(function(err) {
        console.warn('Clerk.load() failed:', err);
      });
    }
  };
  // Fallback: also try on DOMContentLoaded in case __clerk_loaded already fired
  document.addEventListener('DOMContentLoaded', function() {
    if (window.Clerk && !clerkLoaded) {
      clerkLoaded = true;
      window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } }).then(function() {
        updateAuthUI();
        window.Clerk.addListener(function() { updateAuthUI(); });
      }).catch(function(err) {
        console.warn('Clerk.load() fallback failed:', err);
      });
    }
  });
  window.addEventListener('load', function() {
    if (window.Clerk && !clerkLoaded) {
      clerkLoaded = true;
      window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } }).then(function() {
        updateAuthUI();
        window.Clerk.addListener(function() { updateAuthUI(); });
      }).catch(function(err) {
        console.warn('Clerk.load() window.load fallback failed:', err);
      });
    }
  });
  var state = {
      user: null, token: null,
      listings: [], filtered: [],
      currentPage: 1, perPage: 9,
      currentType: 'all',
      currentCategory: 'all',
      currentView: 'grid',
      selectedRating: 0,
      currentListingId: null,
      aiHistory: [],
      mapInstance: null
    };

    var FACILITIES_OPTIONS = ['WiFi', 'Meals Included', 'AC', 'Security', 'Laundry', 'Hot Water', 'Parking', 'CCTV', 'Gym', 'Study Room', 'Geyser', 'Inverter', 'Furnished', 'Attached Bath', 'Kitchen', 'Veg Only', 'Free Delivery', 'Monthly Plan', 'Family Friendly', 'Lift', 'Power Backup'];
    var TYPE_ICONS = { hostel: 'Stay', room: 'Room', flat: 'Home', tiffin: 'Food' };
    var TYPE_LABELS = { hostel: 'Hostel', room: 'Room / PG', flat: 'Flat / Home', tiffin: 'Food / Mess' };
    var GENDER_LABELS = { male: 'Boys only', female: 'Girls only', any: 'All genders' };
    var CATEGORY_OPTIONS = [
      { key: 'rooms', label: 'Rooms', type: 'room', text: 'Private and shared rooms' },
      { key: 'flats', label: 'Flats', type: 'flat', text: 'Apartments for rent' },
      { key: 'pg', label: 'PG', type: 'room', text: 'Managed stays and meals' },
      { key: 'hostel', label: 'Hostels', type: 'hostel', text: 'Budget community living' },
      { key: 'family', label: 'Family Homes', type: 'flat', text: 'Homes for families' },
      { key: 'food', label: 'Food/Mess', type: 'tiffin', text: 'Daily meals and tiffin' },
      { key: 'roommates', label: 'Roommates', type: 'room', text: 'Shared stays and groups' }
    ];

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // INIT
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    (async function init() {
      updateCounts();
      renderCategoryCards();
      renderFeaturedListings();
      renderListings();
      buildFacilitiesGrid();
      //loadSavedAuth();
      await loadListings();
    })();

    function normalizeListing(l) {
      if (!l || typeof l !== 'object') return l;
      l._id = String(l._id || '');
      l.reviews = Array.isArray(l.reviews) ? l.reviews : [];
      l.facilities = Array.isArray(l.facilities) ? l.facilities : [];
      if (typeof l.images === 'string') l.images = [l.images];
      if (l.images && !Array.isArray(l.images) && typeof l.images === 'object') l.images = [l.images];
      l.images = (Array.isArray(l.images) ? l.images : []).map(function (img) {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object') return img.secure_url || img.url || img.src || '';
        return '';
      }).filter(function (url) { return url && typeof url === 'string' && (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)); });
      l.location = l.location || {};
      var lat = parseFloat(l.location.lat), lng = parseFloat(l.location.lng);
      l.location.lat = isFinite(lat) ? lat : null;
      l.location.lng = isFinite(lng) ? lng : null;
      l.pricing = l.pricing || {};
      l.owner = l.owner || {};
      l.avgRating = Number(l.avgRating) || 0;
      l.totalReviews = typeof l.totalReviews === 'number' ? l.totalReviews : l.reviews.length;
      l.views = Number(l.views) || 0;
      l.status = l.status || 'approved';
      l.type = l.type || 'room';
      l.title = l.title || '';
      l.gender = l.gender || 'any';
      l.location.area = l.location.area || '';
      l.location.city = l.location.city || '';
      l.location.address = l.location.address || '';
      l.pricing.amount = Number(l.pricing.amount) || 0;
      l.pricing.period = l.pricing.period || 'month';
      l.owner.whatsapp = l.owner.whatsapp || l.owner.phone || '';
      return l;
    }

    function cssImageUrl(url) {
      return 'url("' + String(url || '').replace(/"/g, '%22') + '")';
    }

    async function loadListings(includeAll) {
      try {
        var adminRequest = includeAll && isAdminUser();
        var url = adminRequest ? '/api/admin/listings?status=all&limit=500' : '/api/listings?limit=500';
        var opts = adminRequest ? { headers: await getAuthHeaders(), credentials: 'include' } : {};
        var res = await fetch(url, opts);
        var data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.listings)) return;
        state.listings = data.listings.map(normalizeListing);
        applyFilters();
        updateCounts();
        renderCategoryCards();
        renderFeaturedListings();
        if (document.getElementById('page-panel')?.classList.contains('active')) loadPanelData();
      } catch (err) { }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // NAVIGATION
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function showPage(p) {
      document.querySelectorAll('.page').forEach(function (el) { el.classList.remove('active') });
      document.getElementById('page-' + p).classList.add('active');
      if (p === 'panel') {
        if (!state.user) { openSignIn(); showPage('home'); return; }
        loadPanelData();
      }
      window.scrollTo(0, 0);
    }
    function toggleNav() { document.getElementById('navLinks').classList.toggle('open') }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // LISTINGS â€” RENDER
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function updateCounts() {
      var all = state.listings.filter(function (l) { return l.status === 'approved' });
      var totalEl = document.getElementById('cnt-all');
      if (totalEl) totalEl.textContent = all.length;
      ['hostel', 'room', 'flat', 'tiffin'].forEach(function (t) {
        var el = document.getElementById('cnt-' + t);
        if (el) el.textContent = all.filter(function (l) { return l.type === t }).length;
      });
      var pg = document.getElementById('cnt-pg');
      var family = document.getElementById('cnt-family');
      var roommates = document.getElementById('cnt-roommates');
      if (pg) pg.textContent = all.filter(function (l) { return l.type === 'room' }).length;
      if (family) family.textContent = all.filter(function (l) { return l.type === 'flat' }).length;
      if (roommates) roommates.textContent = all.filter(function (l) { return l.type === 'room' || l.type === 'flat' }).length;
      var statTotal = document.getElementById('stat-total');
      if (statTotal) statTotal.textContent = all.length + '+';
      var statRating = document.getElementById('stat-rating');
      if (statRating) {
        var rated = all.filter(function (l) { return Number(l.avgRating) > 0 });
        var avg = rated.length ? rated.reduce(function (sum, l) { return sum + Number(l.avgRating || 0) }, 0) / rated.length : 0;
        statRating.textContent = avg.toFixed(1);
      }
    }

    function filterType(t) {
      state.currentType = t; state.currentPage = 1;
      if (t === 'all') state.currentCategory = 'all';
      else if (state.currentCategory === 'all' || !CATEGORY_OPTIONS.some(function (c) { return c.key === state.currentCategory && c.type === t })) state.currentCategory = t;
      document.querySelectorAll('.cat-tab').forEach(function (el) { el.classList.remove('active') });
      var tab = document.getElementById('tab-' + t);
      if (tab) tab.classList.add('active');
      document.querySelectorAll('.nav-links a').forEach(function (a) { a.classList.remove('active') });
      applyFilters();
      var el = document.getElementById('listings-top');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    function filterCategory(key) {
      var cat = CATEGORY_OPTIONS.find(function (c) { return c.key === key });
      if (!cat) return filterType('all');
      state.currentCategory = key;
      filterType(cat.type);
      document.querySelectorAll('.cat-tab').forEach(function (el) { el.classList.remove('active') });
      var tab = document.getElementById('tab-' + key);
      if (tab) tab.classList.add('active');
    }

    function renderCategoryCards() {
      var el = document.getElementById('categoryCards');
      if (!el) return;
      var approved = state.listings.filter(function (l) { return l.status === 'approved' });
      el.innerHTML = CATEGORY_OPTIONS.map(function (cat) {
        var count = approved.filter(function (l) { return l.type === cat.type }).length;
        if (cat.key === 'roommates') count = approved.filter(function (l) { return l.type === 'room' || l.type === 'flat' }).length;
        return '<div class="category-card" onclick="filterCategory(\'' + cat.key + '\')">' +
          '<div class="cc-icon">' + cat.label.split('/')[0] + '</div>' +
          '<strong>' + cat.label + '</strong>' +
          '<span>' + cat.text + '</span>' +
          '<span style="margin-top:12px;color:var(--or);font-weight:700">' + count + ' active</span>' +
          '</div>';
      }).join('');
    }

    function listingCardHtml(l, compact) {
      var saved = (state.user && state.user.savedListings || []).includes(l._id);
      var response = l.featured ? 'Featured' : 'Approved listing';
      var active = l.availability === false ? 'Limited availability' : 'Active now';
      var hasImg = l.images && l.images.length > 0;
      var imgStyle = hasImg ? 'background-image:' + cssImageUrl(l.images[0]) + ';background-size:cover;background-position:center' : '';
      var cityDisplay = l.location.city || l.location.area;
      var amount = Number(l.pricing.amount) || 0;
      return '<div class="listing-card" onclick="openDetail(\'' + l._id + '\')">' +
        '<div class="lc-img t-' + l.type + '"' + (hasImg ? ' style="' + imgStyle + '"' : '') + '>' +
        '<div class="lc-badges">' +
        '<span class="badge badge-verified">Verified</span>' +
        (l.featured ? '<span class="badge badge-featured">Featured</span>' : '') +
        '</div>' +
        (hasImg ? '' : TYPE_ICONS[l.type]) +
        '<div class="lc-save ' + (saved ? 'saved' : '') + '" onclick="event.stopPropagation();toggleSave(\'' + l._id + '\',this)">' +
        (saved ? 'Saved' : 'Save') +
        '</div>' +
        '</div>' +
        '<div class="lc-body">' +
        '<div class="lc-type">' + TYPE_LABELS[l.type] + '</div>' +
        '<div class="lc-name">' + l.title + '</div>' +
        '<div class="lc-loc">' + l.location.area + (cityDisplay && cityDisplay !== l.location.area ? ', ' + cityDisplay : '') + '</div>' +
        '<div class="listing-meta-row">' +
        '<span class="meta-pill"><span class="active-dot"></span>' + active + '</span>' +
        '<span class="meta-pill">' + response + '</span>' +
        '<span class="meta-pill">' + GENDER_LABELS[l.gender] + '</span>' +
        '</div>' +
        (!compact ? '<div class="lc-facilities">' +
          (l.facilities || []).slice(0, 3).map(function (f) { return '<span class="facility-tag">' + f + '</span>' }).join('') +
          (l.facilities && l.facilities.length > 3 ? '<span class="facility-tag">+more</span>' : '') +
          '</div>' : '') +
        '<div class="lc-foot">' +
        '<div class="lc-price">Rs ' + amount.toLocaleString() + '<small>/' + l.pricing.period + '</small></div>' +
        '<div class="lc-rating"><span class="star">â˜…</span> ' + l.avgRating + ' (' + l.totalReviews + ')</div>' +
        '</div>' +
        '</div>' +
        '</div>';
    }

    function renderFeaturedListings() {
      var el = document.getElementById('featuredGrid');
      if (!el) return;
      var featured = state.listings.filter(function (l) { return l.status === 'approved' && (l.featured || l.avgRating >= 4.6) }).slice(0, 3);
      if (!featured.length) featured = state.listings.filter(function (l) { return l.status === 'approved' }).slice(0, 3);
      el.innerHTML = featured.map(function (l) { return listingCardHtml(l, true) }).join('');
    }

    function applyFilters() {
      var gender = document.getElementById('filter-gender').value;
      var sort = document.getElementById('filter-sort').value;
      var minP = parseInt(document.getElementById('qs-min').value) || 0;
      var maxP = parseInt(document.getElementById('qs-max').value) || Infinity;
      var area = document.getElementById('qs-area').value.toLowerCase();
      state.filtered = state.listings.filter(function (l) {
        if (l.status !== 'approved') return false;
        if (state.currentType !== 'all' && l.type !== state.currentType) return false;
        if (gender && l.gender !== gender && l.gender !== 'any') return false;
        if (l.pricing.amount < minP || l.pricing.amount > maxP) return false;
        var searchText = ((l.location.area || '') + ' ' + (l.location.city || '') + ' ' + (l.title || '')).toLowerCase();
        if (area && !searchText.includes(area)) return false;
        return true;
      });
      if (sort === 'price-asc') state.filtered.sort(function (a, b) { return a.pricing.amount - b.pricing.amount });
      else if (sort === 'price-desc') state.filtered.sort(function (a, b) { return b.pricing.amount - a.pricing.amount });
      else if (sort === 'rating') state.filtered.sort(function (a, b) { return b.avgRating - a.avgRating });
      else state.filtered.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) });
      state.currentPage = 1;
      var h = document.getElementById('listings-heading');
      if (h) {
        var cat = CATEGORY_OPTIONS.find(function (c) { return c.key === state.currentCategory });
        var t = state.currentType === 'all' ? 'All Listings' : (cat ? cat.label : TYPE_LABELS[state.currentType] + 's');
        h.textContent = t + ' (' + state.filtered.length + ')';
      }
      renderListings();
      renderFeaturedListings();
      if (state.currentView === 'map') renderMapView();
    }

    function doSearch() {
      filterType(document.getElementById('qs-type').value);
      document.getElementById('listings-top').scrollIntoView({ behavior: 'smooth' });
    }
    function syncFilter() {
      var v = document.getElementById('qs-type').value;
      filterType(v);
    }

    function renderListings() {
      var grid = document.getElementById('listingsGrid');
      var start = (state.currentPage - 1) * state.perPage;
      var page = state.filtered.slice(start, start + state.perPage);
      if (state.filtered.length === 0) {
        grid.innerHTML = '<div class="no-listings" style="grid-column:1/-1"><div class="big">ðŸ”</div><h3>No listings found</h3><p>Try adjusting your filters or search terms</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
      }
      grid.innerHTML = page.map(function (l) { return listingCardHtml(l, false) }).join('');
      renderPagination();
    }

    function renderPagination() {
      var pages = Math.ceil(state.filtered.length / state.perPage);
      if (pages <= 1) { document.getElementById('pagination').innerHTML = ''; return; }
      var html = '';
      if (state.currentPage > 1) html += '<button class="page-btn" onclick="goPage(' + (state.currentPage - 1) + ')">&lsaquo;</button>';
      for (var i = 1; i <= pages; i++) {
        html += '<button class="page-btn' + (i === state.currentPage ? ' active' : '') + '" onclick="goPage(' + i + ')">' + i + '</button>';
      }
      if (state.currentPage < pages) html += '<button class="page-btn" onclick="goPage(' + (state.currentPage + 1) + ')">&rsaquo;</button>';
      document.getElementById('pagination').innerHTML = html;
    }
    function goPage(p) { state.currentPage = p; renderListings(); document.getElementById('listings-top').scrollIntoView({ behavior: 'smooth' }) }

    function setView(v) {
      state.currentView = v;
      document.getElementById('gridViewBtn').classList.toggle('active', v === 'grid');
      document.getElementById('mapViewBtn').classList.toggle('active', v === 'map');
      document.getElementById('listingsGrid').style.display = v === 'grid' ? 'grid' : 'none';
      document.getElementById('mapContainer').style.display = v === 'map' ? 'block' : 'none';
      if (v === 'map') renderMapView();
    }

    function ensureLeaflet() {
      return new Promise(function (resolve, reject) {
        if (window.L) return resolve();
        if (!document.getElementById('leafletCss')) {
          var link = document.createElement('link');
          link.id = 'leafletCss'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        var existing = document.getElementById('leafletJs');
        if (existing) {
          if (window.L) return resolve();
          var onDone = function () { existing.removeEventListener('load', onDone); existing.removeEventListener('error', onErr); resolve(); };
          var onErr = function () { existing.removeEventListener('load', onDone); existing.removeEventListener('error', onErr); reject(new Error('Leaflet failed')); };
          existing.addEventListener('load', onDone);
          existing.addEventListener('error', onErr);
          return;
        }
        var script = document.createElement('script');
        script.id = 'leafletJs'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve; script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    function renderStaticMapFallback(el, points) {
      var lats = points.map(function (l) { return Number(l.location.lat) }).filter(isFinite);
      var lngs = points.map(function (l) { return Number(l.location.lng) }).filter(isFinite);
      var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
      var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
      var latSpan = maxLat - minLat || 0.02;
      var lngSpan = maxLng - minLng || 0.02;
      el.innerHTML = '<div class="static-map-fallback">' + points.map(function (l) {
        var amount = Number(l.pricing.amount) || 0;
        var left = 8 + ((Number(l.location.lng) - minLng) / lngSpan) * 84;
        var top = 92 - ((Number(l.location.lat) - minLat) / latSpan) * 84;
        return '<button class="static-map-pin" style="left:' + left + '%;top:' + top + '%" onclick="openDetail(\'' + l._id + '\')">Rs ' + Math.round(amount / 1000) + 'k</button>';
      }).join('') + '</div>';
    }

    async function renderMapView() {
      var el = document.getElementById('map-container');
      if (!el) return;
      var side = document.getElementById('mapListPanel');
      var points = state.filtered.filter(function (l) {
        return l.location && l.location.lat !== null && l.location.lng !== null && Number.isFinite(Number(l.location.lat)) && Number.isFinite(Number(l.location.lng));
      });
      if (side) {
        side.innerHTML = '<div style="padding:6px 6px 14px"><strong>' + state.filtered.length + ' matching places</strong><p style="color:var(--muted);font-size:.82rem;margin-top:4px">Tap a card or map pin to inspect the listing.</p></div>' + state.filtered.slice(0, 12).map(function (l) {
          var amount = Number(l.pricing.amount) || 0;
          return '<div class="map-list-card" onclick="openDetail(\'' + l._id + '\')"><strong>' + l.title + '</strong><span>' + TYPE_LABELS[l.type] + ' in ' + (l.location.area || l.location.city || 'Location pending') + '</span><span>Rs ' + amount.toLocaleString() + '/' + l.pricing.period + ' - ' + l.avgRating + ' rating</span></div>';
        }).join('');
      }
      if (!points.length) {
        if (state.mapInstance) { state.mapInstance.remove(); state.mapInstance = null; }
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);flex-direction:column;gap:1rem"><div style="font-size:2rem">Map</div><p>Map locations will appear when listings include coordinates.</p></div>';
        return;
      }
      try {
        await ensureLeaflet();
        if (state.mapInstance) { state.mapInstance.remove(); state.mapInstance = null; }
        el.innerHTML = '';
        var map = L.map(el, { zoomControl: false }).setView([points[0].location.lat, points[0].location.lng], 12);
        state.mapInstance = map;
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
        var bounds = [];
        points.forEach(function (l) {
          var amount = Number(l.pricing.amount) || 0;
          var html = '<div class="nikunj-marker">Rs ' + Math.round(amount / 1000) + 'k</div>';
          var icon = L.divIcon({ html: html, className: '', iconSize: [72, 30], iconAnchor: [36, 15] });
          if (l.location.lat !== null && l.location.lng !== null && isFinite(l.location.lat) && isFinite(l.location.lng)) {
            L.marker([l.location.lat, l.location.lng], { icon: icon }).addTo(map).bindPopup('<strong>' + l.title + '</strong><br>' + TYPE_LABELS[l.type] + ' - ' + (l.location.area || l.location.city || 'Location pending') + '<br>Rs ' + amount.toLocaleString() + '/' + l.pricing.period + '<br><button style="margin-top:8px;border:0;background:#16211D;color:#fff;border-radius:999px;padding:6px 10px;cursor:pointer" onclick="openDetail(\'' + l._id + '\')">View details</button>');
            bounds.push([l.location.lat, l.location.lng]);
          }
        });
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [42, 42] });
        setTimeout(function () { map.invalidateSize() }, 100);
      } catch (err) {
        console.warn('Leaflet map failed, using static marker fallback', err);
        renderStaticMapFallback(el, points);
      }
    }

    async function toggleSave(id, el) {
      if (!state.user) { openSignIn(); return; }
      var saved = (state.user.savedListings || []);
      var idx = saved.indexOf(id);
      var wasSaved = idx > -1;
      if (idx > -1) { saved.splice(idx, 1); el.innerHTML = '&#129293;'; el.classList.remove('saved'); }
      else { saved.push(id); el.innerHTML = '&#128278;'; el.classList.add('saved'); }
      state.user.savedListings = saved;
      localStorage.setItem('nikunj_user', JSON.stringify(state.user));
      if (state.user && id.indexOf('new_') !== 0) {
        try {
          var res = await authFetch('/api/auth/save/' + id, { method: 'PUT' });
          if (!res.ok) throw new Error('Save failed');
        } catch (err) {
          if (wasSaved) { saved.push(id); el.innerHTML = '&#128278;'; el.classList.add('saved'); }
          else { state.user.savedListings = saved.filter(function (x) { return x !== id }); el.innerHTML = '&#129293;'; el.classList.remove('saved'); }
          showToast('Could not update saved listing');
          return;
        }
      }
      showToast(wasSaved ? 'Removed from saved' : 'Saved!');
    }

    // -----------------------------------------------------------
    // LISTING DETAIL
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function openDetail(id) {
      var l = state.listings.find(function (x) { return x._id === id });
      if (!l) return;
      state.currentListingId = id;
      state.selectedRating = 0;
      var img = document.getElementById('dm-img');
      if (!img) { openModal('detailModal'); return; }
      img.className = 'modal-imgs t-' + l.type;
      var hasImg = l.images && l.images.length > 0;
      if (hasImg) {
        img.style.backgroundImage = cssImageUrl(l.images[0]);
        img.style.backgroundSize = 'cover';
        img.style.backgroundPosition = 'center';
        img.innerHTML = '<button class="modal-close" onclick="closeModal(\'detailModal\')">âœ•</button>';
      } else {
        img.style.backgroundImage = '';
        var fallbackIcon = TYPE_ICONS[l.type] || 'ðŸ–¼ï¸';
        img.innerHTML = '<button class="modal-close" onclick="closeModal(\'detailModal\')">âœ•</button>' + fallbackIcon;
      }
      var dmType = document.getElementById('dm-type'); if (dmType) dmType.textContent = TYPE_LABELS[l.type] || l.type;
      var dmTitle = document.getElementById('dm-title'); if (dmTitle) dmTitle.textContent = l.title;
      var amount = Number(l.pricing.amount) || 0;
      var dmPrice = document.getElementById('dm-price'); if (dmPrice) dmPrice.textContent = 'Rs ' + amount.toLocaleString();
      var dmPeriod = document.getElementById('dm-period'); if (dmPeriod) dmPeriod.textContent = '/' + l.pricing.period;
      var dmLoc = document.getElementById('dm-loc'); if (dmLoc) dmLoc.textContent = [l.location.area, l.location.city].filter(Boolean).join(', ') || 'Location pending';
      var dmGender = document.getElementById('dm-gender'); if (dmGender) dmGender.textContent = GENDER_LABELS[l.gender] || l.gender;
      var dmRating = document.getElementById('dm-rating'); if (dmRating) dmRating.textContent = l.avgRating + ' (' + l.totalReviews + ' reviews)';
      var dmViews = document.getElementById('dm-views'); if (dmViews) dmViews.textContent = l.views;
      var dmDesc = document.getElementById('dm-desc'); if (dmDesc) dmDesc.textContent = l.description || '';
      var dmAddress = document.getElementById('dm-address'); if (dmAddress) dmAddress.textContent = l.location.address || '';
      var fac = document.getElementById('dm-facilities');
      if (fac) fac.innerHTML = (l.facilities || []).map(function (f) { return '<span class="facility-tag">' + f + '</span>' }).join('');
      var dmCall = document.getElementById('dm-call'); if (dmCall) dmCall.onclick = function () { if (l.owner && l.owner.phone) window.open('tel:' + l.owner.phone) };
      var dmWa = document.getElementById('dm-wa'); if (dmWa) dmWa.onclick = function () {
        var number = String(l.owner.whatsapp || l.owner.phone || '').replace(/[^0-9]/g, '');
        if (number) window.open('https://wa.me/' + number);
      };
      var dmRevCount = document.getElementById('dm-review-count'); if (dmRevCount) dmRevCount.textContent = (l.reviews || []).length;
      var revEl = document.getElementById('dm-reviews');
      if (l.reviews && l.reviews.length > 0) {
        revEl.innerHTML = l.reviews.map(function (r) {
          return '<div class="review-item"><div class="review-top"><span class="review-name">' + r.name + '</span><span class="lc-rating"><span class="star">' + ('â˜…').repeat(Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0)))) + '</span></span></div><p class="review-text">' + r.comment + '</p></div>';
        }).join('');
      } else { revEl.innerHTML = '<p style="color:var(--muted);font-size:.85rem">No reviews yet. Be the first!</p>'; }
      var addRev = document.getElementById('addReviewSection'); if (addRev) addRev.style.display = state.user ? 'block' : 'none';
      renderDetailMap(l);
      document.querySelectorAll('.star-btn').forEach(function (b) { b.classList.remove('active') });
      var revText = document.getElementById('reviewText'); if (revText) revText.value = '';
      l.views += 1;
      openModal('detailModal');
    }

    function renderDetailMap(l) {
      var map = document.getElementById('dm-map');
      if (!map) return;
      if (!l || !l.location) { map.innerHTML = ''; return; }
      var address = [l.location.address, l.location.area, l.location.city].filter(Boolean).join(', ');
      if (l.location.lat !== null && l.location.lng !== null && isFinite(Number(l.location.lat)) && isFinite(Number(l.location.lng))) {
        var lat = Number(l.location.lat), lng = Number(l.location.lng);
        map.innerHTML = '<iframe title="Listing location" src="https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - .02) + '%2C' + (lat - .02) + '%2C' + (lng + .02) + '%2C' + (lat + .02) + '&layer=mapnik&marker=' + lat + '%2C' + lng + '" style="border:0;width:100%;height:100%"></iframe>';
      } else {
        map.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted)"><span>ðŸ“ ' + address + '</span></div>';
      }
    }

    function setRating(v) {
      state.selectedRating = v;
      document.querySelectorAll('.star-btn').forEach(function (b) {
        b.classList.toggle('active', parseInt(b.dataset.val) <= v);
      });
    }

    async function submitReview() {
      if (!state.user) { openSignIn(); return; }
      if (!state.selectedRating) { showToast('Please select a rating'); return; }
      var text = document.getElementById('reviewText').value.trim();
      if (!text) { showToast('Please write a review'); return; }
      var l = state.listings.find(function (x) { return x._id === state.currentListingId });
      if (!l) return;
      if (state.user && l._id.indexOf('new_') !== 0) {
        try {
          var res = await authFetch('/api/listings/' + l._id + '/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: state.selectedRating, comment: text }) });
          var data = await res.json();
          if (!res.ok || !data.success) { showToast(data.message || 'Review failed'); return; }
          if (data.listing) {
            var idx = state.listings.findIndex(function (x) { return x._id === l._id });
            state.listings[idx] = normalizeListing(data.listing);
          }
        } catch (err) { showToast('Review failed'); return; }
      } else {
        l.reviews.push({ name: state.user.name, rating: state.selectedRating, comment: text, date: new Date().toISOString() });
        var sum = l.reviews.reduce(function (a, r) { return a + r.rating }, 0);
        l.avgRating = Math.round(sum / l.reviews.length * 10) / 10;
        l.totalReviews = l.reviews.length;
      }
      closeModal('detailModal');
      setTimeout(function () { openDetail(state.currentListingId) }, 50);
      showToast('Review submitted! Thank you.');
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PANEL
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function showPanelTab(t) {
      if ((t === 'admin' || t === 'users') && !isAdminUser()) {
        showToast('Admin access required');
        return;
      }
      ['dashboard', 'listings', 'add', 'admin', 'users'].forEach(function (tab) {
        var pt = document.getElementById('pt-' + tab);
        var sb = document.getElementById('sb-' + tab);
        if (pt) pt.style.display = t === tab ? 'block' : 'none';
        if (sb) sb.classList.toggle('active', t === tab);
      });
      if (t === 'admin') loadAdminData();
      if (t === 'listings') loadOwnerListings();
      if (t === 'users') loadUsers();
    }

    function loadPanelData() {
      if (!state.user) return;
      var welcome = 'Welcome, ' + state.user.name;
      document.getElementById('panel-welcome').textContent = welcome;
      var approved = state.listings.filter(function (l) { return l.status === 'approved' }).length;
      var pending = state.listings.filter(function (l) { return l.status === 'pending' }).length;
      var mine = state.listings.filter(function (l) { return l.owner && l.owner.name === state.user.name }).length;
      var totalViews = state.listings.reduce(function (sum, l) { return sum + (Number(l.views) || 0) }, 0);
      var rated = state.listings.filter(function (l) { return Number(l.avgRating) > 0 });
      var avgRating = rated.length ? rated.reduce(function (sum, l) { return sum + Number(l.avgRating || 0) }, 0) / rated.length : 0;
      var statsEl = document.getElementById('panelStats');
      document.getElementById('sb-admin').style.display = 'none';
      document.getElementById('sb-users').style.display = 'none';
      if (isAdminUser()) {
        statsEl.innerHTML =
          '<div class="stat-card"><div class="s-num">' + approved + '</div><div class="s-lbl">Live listings</div><span class="s-sub ok">All verified</span></div>' +
          '<div class="stat-card"><div class="s-num">' + pending + '</div><div class="s-lbl">Pending review</div><span class="s-sub warn">Need action</span></div>' +
          '<div class="stat-card"><div class="s-num">' + totalViews + '</div><div class="s-lbl">Listing views</div><span class="s-sub info">All time</span></div>' +
          '<div class="stat-card"><div class="s-num">' + avgRating.toFixed(1) + '</div><div class="s-lbl">Avg. rating</div><span class="s-sub info">From reviews</span></div>';
        document.getElementById('sb-admin').style.display = 'flex';
        document.getElementById('sb-users').style.display = 'flex';
      } else {
        statsEl.innerHTML =
          '<div class="stat-card"><div class="s-num">' + mine + '</div><div class="s-lbl">My listings</div><span class="s-sub info">All time</span></div>' +
          '<div class="stat-card"><div class="s-num">0</div><div class="s-lbl">Pending</div><span class="s-sub warn">Under review</span></div>' +
          '<div class="stat-card"><div class="s-num">0</div><div class="s-lbl">Total views</div><span class="s-sub ok">This month</span></div>';
      }
      loadRecentTable();
    }

    function loadRecentTable() {
      var rows = state.listings.slice(0, 5).map(function (l) {
        return '<tr><td>' + l.title + '</td><td>' + TYPE_LABELS[l.type] + '</td><td>' + l.location.area + '</td><td>Rs ' + l.pricing.amount.toLocaleString() + '</td><td><span class="status-badge status-' + l.status + '">' + l.status + '</span></td><td class="action-btns"><button class="action-btn view" onclick="openDetail(\'' + l._id + '\');showPage(\'home\')">View</button></td></tr>';
      }).join('');
      document.getElementById('panelRecentTable').innerHTML = '<table><thead><tr><th>Title</th><th>Type</th><th>Area</th><th>Price</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    async function loadOwnerListings() {
      var listings = [];
      try {
        var res = await authFetch('/api/listings/owner/mine');
        var data = await res.json();
        if (res.ok && data.success && Array.isArray(data.listings)) listings = data.listings.map(normalizeListing);
      } catch (err) { }
      if (!listings.length) {
        // Fallback: filter from cached state by owner name
        listings = state.listings.filter(function (l) { return state.user && l.owner && (l.owner.name === state.user.name || (l.owner.user && l.owner.user.toString() === state.user.id)); });
      }
      var rows = listings.map(function (l) {
        return '<tr><td>' + l.title + '</td><td>' + TYPE_LABELS[l.type] + '</td><td>Rs ' + l.pricing.amount.toLocaleString() + '</td><td><span class="status-badge status-' + l.status + '">' + l.status + '</span></td><td>' + l.avgRating + 'â˜…</td><td class="action-btns"><button class="action-btn view" onclick="openDetail(\'' + l._id + '\');showPage(\'home\')">View</button></td></tr>';
      }).join('');
      document.getElementById('ownerListingsTable').innerHTML = rows ? '<table><thead><tr><th>Title</th><th>Type</th><th>Price</th><th>Status</th><th>Rating</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p style="padding:1.5rem;color:var(--muted)">You have not listed any properties yet.</p>';
    }

    function loadAdminData() {
      if (!isAdminUser()) {
        showToast('Admin access required');
        showPanelTab('dashboard');
        return;
      }
      var pending = state.listings.filter(function (l) { return l.status === 'pending' });
      document.getElementById('pendingBadge').textContent = pending.length;
      var statsEl = document.getElementById('adminStats');
      statsEl.innerHTML =
        '<div class="stat-card"><div class="s-num">' + state.listings.filter(function (l) { return l.status === 'approved' }).length + '</div><div class="s-lbl">Approved</div><span class="s-sub ok">Live</span></div>' +
        '<div class="stat-card"><div class="s-num">' + pending.length + '</div><div class="s-lbl">Pending</div><span class="s-sub warn">Need review</span></div>' +
        '<div class="stat-card"><div class="s-num">' + state.listings.filter(function (l) { return l.status === 'rejected' }).length + '</div><div class="s-lbl">Rejected</div><span class="s-sub" style="color:var(--muted)">Declined</span></div>';
      var pendingRows = pending.map(function (l) {
        return '<tr id="prow-' + l._id + '"><td>' + l.title + '</td><td>' + TYPE_LABELS[l.type] + '</td><td>' + l.location.area + '</td><td>Rs ' + l.pricing.amount.toLocaleString() + '</td><td>' + l.owner.name + '</td><td class="action-btns">' +
          '<button class="action-btn approve" onclick="adminAction(\'' + l._id + '\',\'approved\')">âœ“ Approve</button>' +
          '<button class="action-btn reject" onclick="adminAction(\'' + l._id + '\',\'rejected\')">âœ— Reject</button>' +
          '</td></tr>';
      }).join('');
      document.getElementById('pendingTable').innerHTML = pending.length ? '<table><thead><tr><th>Title</th><th>Type</th><th>Area</th><th>Price</th><th>Owner</th><th>Actions</th></tr></thead><tbody>' + pendingRows + '</tbody></table>' : '<p style="padding:1.5rem;color:var(--muted)">No pending listings ðŸŽ‰</p>';
      var allRows = state.listings.map(function (l) {
        return '<tr><td>' + l.title + '</td><td>' + TYPE_LABELS[l.type] + '</td><td><span class="status-badge status-' + l.status + '">' + l.status + '</span></td><td>' + l.avgRating + 'â˜…</td><td class="action-btns">' +
          '<button class="action-btn view" onclick="openDetail(\'' + l._id + '\');showPage(\'home\')">View</button>' +
          '<button class="action-btn delete" onclick="deleteListing(\'' + l._id + '\')">Delete</button>' +
          '</td></tr>';
      }).join('');
      document.getElementById('allAdminTable').innerHTML = '<table><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead><tbody>' + allRows + '</tbody></table>';
    }

    async function adminAction(id, status) {
      if (!isAdminUser()) {
        showToast('Admin access required');
        return;
      }
      if (state.user && id.indexOf('new_') !== 0) {
        try {
          var action = status === 'approved' ? 'approve' : 'reject';
          var res = await authFetch('/api/admin/listings/' + id + '/' + action, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
          if (!res.ok) { showToast('Admin action denied'); return; }
        } catch (err) { showToast('Admin action failed'); return; }
      }
      var l = state.listings.find(function (x) { return x._id === id });
      if (l) { l.status = status; }
      var row = document.getElementById('prow-' + id);
      if (row) row.style.opacity = '0.3';
      updateCounts(); applyFilters();
      showToast(status === 'approved' ? 'Listing approved & live!' : 'Listing rejected');
      setTimeout(function () { loadAdminData() }, 500);
    }

    async function deleteListing(id) {
      if (!isAdminUser()) {
        showToast('Admin access required');
        return;
      }
      if (!confirm('Delete this listing?')) return;
      if (state.user && id.indexOf('new_') !== 0) {
        try {
          var res = await authFetch('/api/admin/listings/' + id, { method: 'DELETE' });
          if (!res.ok) { showToast('Delete denied'); return; }
        } catch (err) { showToast('Delete failed'); return; }
      }
      state.listings = state.listings.filter(function (l) { return l._id !== id });
      state.filtered = state.filtered.filter(function (l) { return l._id !== id });
      updateCounts(); renderListings(); loadAdminData();
      showToast('Listing deleted');
    }

    async function loadUsers() {
      if (!isAdminUser()) {
        showToast('Admin access required');
        showPanelTab('dashboard');
        return;
      }
      var users = [];
      if (state.user) {
        try {
          var res = await authFetch('/api/admin/users');
          var data = await res.json();
          if (res.ok && data.success && Array.isArray(data.users)) users = data.users.map(function (u) {
            return { name: u.name, email: u.email, role: u.role, createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '' };
          });
        } catch (err) { }
      }
      var rows = users.map(function (u) {
        return '<tr><td>' + u.name + '</td><td>' + u.email + '</td><td><span class="status-badge" style="background:var(--surf);color:var(--mid)">' + u.role + '</span></td><td>' + u.createdAt + '</td></tr>';
      }).join('');
      document.getElementById('usersTable').innerHTML = rows ? '<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p style="padding:1.5rem;color:var(--muted)">No users available</p>';
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ADD LISTING FORM
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function buildFacilitiesGrid() {
      var el = document.getElementById('facilitiesGrid');
      if (!el) return;
      el.innerHTML = FACILITIES_OPTIONS.map(function (f) {
        return '<label class="facility-check"><input type="checkbox" value="' + f + '">' + f + '</label>';
      }).join('');
      el.querySelectorAll('.facility-check').forEach(function (label) {
        label.querySelector('input').addEventListener('change', function () {
          label.classList.toggle('checked', this.checked);
        });
      });
    }

    // Image helpers
    var selectedImages = [];
    var listingSubmitting = false;
    function previewImages(files) {
      Array.from(files).forEach(function (file) {
        if (selectedImages.length >= 5) { showToast('Max 5 images allowed'); return; }
        selectedImages.push(file);
      });
      rebuildImagePreviews();
    }
    function rebuildImagePreviews() {
      var previews = document.getElementById('imagePreviews');
      previews.innerHTML = '';
      selectedImages.forEach(function (file, idx) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var div = document.createElement('div');
          div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--brd)';
          div.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover"/>' +
            '<button onclick="removeImage(' + idx + ')" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center">x</button>';
          previews.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    }
    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('imageDropzone').style.borderColor = 'var(--brd)';
      previewImages(e.dataTransfer.files);
    }
    function removeImage(idx) {
      selectedImages.splice(idx, 1);
      rebuildImagePreviews();
    }

    async function geocodeFormLocation(location) {
      if (Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) return location;
      var q = [location.address, location.area, location.city, location.pincode, 'India'].filter(Boolean).join(', ');
      if (!q) return location;
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort() }, 3500);
      try {
        var res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), { signal: controller.signal });
        if (!res.ok) return location;
        var data = await res.json();
        if (data && data[0] && data[0].lat && data[0].lon) {
          location.lat = Number(data[0].lat);
          location.lng = Number(data[0].lon);
        }
      } catch (err) {
        console.warn('Client geocoding failed', err);
      } finally {
        clearTimeout(timer);
      }
      return location;
    }

    async function submitListing() {
      if (listingSubmitting) return;
      if (!state.user) { openSignIn(); return; }
      var title = document.getElementById('f-title').value.trim();
      var type = document.getElementById('f-type').value;
      var desc = document.getElementById('f-desc').value.trim();
      var price = document.getElementById('f-price').value;
      var address = document.getElementById('f-address').value.trim();
      var area = document.getElementById('f-area').value.trim();
      var city = (document.getElementById('f-city') ? document.getElementById('f-city').value.trim() : '');
      var oname = document.getElementById('f-oname').value.trim();
      var phone = document.getElementById('f-phone').value.trim();
      var alertEl = document.getElementById('addFormAlert');
      if (!title || !desc || !price || !address || !area || !city || !oname || !phone) {
        alertEl.innerHTML = '<div class="alert alert-error">Please fill all required fields (marked with *).</div>';
        return;
      }
      listingSubmitting = true;
      var submitBtn = document.getElementById('submitListingBtn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      var facilities = [];
      document.querySelectorAll('#facilitiesGrid input:checked').forEach(function (cb) { facilities.push(cb.value) });
      var newListing = {
        title: title, type: type, description: desc,
        owner: { name: oname, phone: phone, whatsapp: document.getElementById('f-wa').value || phone },
        location: {
          address: address,
          area: area,
          city: city,
          pincode: document.getElementById('f-pin').value,
          nearbyColleges: document.getElementById('f-colleges').value
            .split(',')
            .map(function (c) { return c.trim() })
            .filter(Boolean)
        },
        pricing: { amount: parseInt(price), deposit: parseInt(document.getElementById('f-deposit').value) || 0, negotiable: false, period: 'month' },
        facilities: facilities, gender: document.getElementById('f-gender').value,
        images: [], reviews: []
      };
      newListing.location = await geocodeFormLocation(newListing.location);
      if (selectedImages.length > 0 && state.user) {
        alertEl.innerHTML = '<div class="alert" style="background:var(--surf);border:1px solid var(--brd)">Uploading images...</div>';
        var fd = new FormData();
        selectedImages.forEach(function (f) { fd.append('images', f) });
        try {
          var uploadRes = await authFetch('/api/upload/images', { method: 'POST', body: fd });
          var uploadData = await uploadRes.json();
          console.debug('Nikunj upload response', uploadData);
          var urls = Array.isArray(uploadData.urls) ? uploadData.urls : (Array.isArray(uploadData.images) ? uploadData.images : []);
          urls = urls.filter(function (url) { return typeof url === 'string' && /^https?:\/\//i.test(url); });
          if (uploadData.success && urls.length) {
            newListing.images = urls;
          } else {
            console.warn('Image upload returned no URLs:', uploadData);
            alertEl.innerHTML = '<div class="alert alert-error">Image upload failed: ' + (uploadData.message || 'No image URLs returned') + '. Listing will be submitted without images.</div>';
            showToast('Images could not be uploaded â€” submitting listing without images');
          }
        } catch (uploadErr) {
          console.warn('Image upload error:', uploadErr);
          alertEl.innerHTML = '<div class="alert alert-error">Image upload failed: ' + (uploadErr.message || 'Unknown error') + '. Listing will be submitted without images.</div>';
          showToast('Images could not be uploaded â€” submitting listing without images');
        }
        await finishSubmit(newListing);
      } else {
        await finishSubmit(newListing);
      }
    }

    async function finishSubmit(listing) {
      var submitBtn = document.getElementById('submitListingBtn');
      if (state.user) {
        try {
          delete listing._id;
          var res = await authFetch('/api/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(listing) });
          var data = await res.json();
          if (res.ok && data.success && data.listing) listing = normalizeListing(data.listing);
          else {
            document.getElementById('addFormAlert').innerHTML = '<div class="alert alert-error">' + (data.message || 'Listing submission failed') + '</div>';
            return;
          }
        } catch (err) {
          document.getElementById('addFormAlert').innerHTML = '<div class="alert alert-error">Listing submission failed: ' + (err.message || 'Network error') + '</div>';
          return;
        } finally {
          listingSubmitting = false;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit for Admin Review â†’'; }
        }
      }
      state.listings.unshift(listing);
      updateCounts();
      document.getElementById('addFormAlert').innerHTML = '<div class="alert alert-success">Listing submitted! It will go live within 24 hours after admin review.</div>';
      document.getElementById('addListingForm').querySelectorAll('input,textarea,select').forEach(function (el) { el.value = ''; });
      document.querySelectorAll('#facilitiesGrid .facility-check').forEach(function (l) { l.classList.remove('checked'); l.querySelector('input').checked = false; });
      document.getElementById('imagePreviews').innerHTML = '';
      selectedImages = [];
      showToast('Listing submitted for admin review!');
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // AI CHAT
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function toggleAI() { document.getElementById('aiPanel').classList.toggle('open') }
    function openAI() { document.getElementById('aiPanel').classList.add('open') }
    function closeAI() { document.getElementById('aiPanel').classList.remove('open') }

    function sendAI(pretext) {
      var input = document.getElementById('aiInput');
      var msg = pretext || input.value.trim();
      if (!msg) return;
      input.value = '';
      appendMsg(msg, 'user');
      var typing = appendMsg('', 'typing');
      var approved = state.listings.filter(function (l) { return l.status === 'approved' });
      var ctx = approved.map(function (l) { return l.title + ' (' + l.type + ') | ' + l.location.area + ' | â‚¹' + l.pricing.amount + '/mo | â˜…' + l.avgRating }).join('\n');
      fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: state.aiHistory })
      }).then(function (r) { return r.json() }).then(function (d) {
        typing.remove();
        var reply = d.reply || getLocalAIReply(msg, approved);
        appendMsg(reply, 'bot');
        state.aiHistory.push({ role: 'user', content: msg }, { role: 'assistant', content: reply });
        if (state.aiHistory.length > 10) state.aiHistory = state.aiHistory.slice(-10);
      }).catch(function () {
        typing.remove();
        appendMsg(getLocalAIReply(msg, approved), 'bot');
      });
    }

    function appendMsg(text, type) {
      var msgs = document.getElementById('aiMessages');
      var div = document.createElement('div');
      div.className = 'chat-msg ' + type;
      if (type === 'typing') { div.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>'; }
      else { div.textContent = text; }
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function getLocalAIReply(msg, listings) {
      var m = msg.toLowerCase();
      var filtered;
      if (m.includes('hostel')) filtered = listings.filter(function (l) { return l.type === 'hostel' });
      else if (m.includes('pg') || m.includes('room') || m.includes('girls') || m.includes('girl')) filtered = listings.filter(function (l) { return l.type === 'room' || (m.includes('girl') && l.gender === 'female') });
      else if (m.includes('flat')) filtered = listings.filter(function (l) { return l.type === 'flat' });
      else if (m.includes('tiffin') || m.includes('food') || m.includes('meal')) filtered = listings.filter(function (l) { return l.type === 'tiffin' });
      else filtered = listings.slice(0, 3);
      if (!filtered || filtered.length === 0) return 'Koi listing nahi mili aapki search ke liye. Kya aap area ya budget batayenge?';
      var top = filtered.slice(0, 2);
      return top.map(function (l) { return 'ðŸ  ' + l.title + '\nðŸ“ ' + l.location.area + ' | â‚¹' + l.pricing.amount + '/mo | â˜…' + l.avgRating + '\nFacilities: ' + (l.facilities || []).slice(0, 3).join(', ') }).join('\n\n') + '\n\nKya aap in listings ke baare mein aur jaanna chahte hain?';
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MODALS & UTILS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden' }
    function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = '' }
    function showToast(msg) {
      var t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(function () { t.classList.remove('show') }, 2800);
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.open').forEach(function (m) { m.classList.remove('open') }); document.body.style.overflow = '' } });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // CLERK UTILITY FUNCTIONS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    function isAdminUser() { return !!(state.user && state.user.role === 'admin') }
    function isOwnerUser() { return !!(state.user && (state.user.role === 'owner' || state.user.role === 'admin')) }

    async function getClerkToken() {
      var activeSession = (clerk && clerk.session) || (window.Clerk && window.Clerk.session);
      try {
        if (activeSession && activeSession.getToken) {
          var token = await activeSession.getToken();
          if (token) return token;
        }
        if (clerk && clerk.client && Array.isArray(clerk.client.sessions)) {
          var session = clerk.client.sessions.find(function (s) { return s.status === 'active'; }) || clerk.client.sessions[0];
          if (session && session.getToken) return await session.getToken({ skipCache: true });
        }
      } catch (err) {
        console.warn('Unable to read Clerk token', err);
      }
      return null;
    }

    async function getAuthHeaders(headers) {
      var token = await getClerkToken();
      if (token) state.token = token;
      return Object.assign({}, headers || {}, token ? { 'Authorization': 'Bearer ' + token } : {});
    }

    async function authFetch(url, options) {
      options = options || {};
      options.headers = await getAuthHeaders(options.headers);
      options.credentials = 'include';
      return fetch(url, options);
    }

    async function fetchSafeClerkUser() {
      var token = await getClerkToken();
      state.token = token;
      if (!token) return null;
      try {
        var res = await authFetch('/api/clerk/me');
        var data = await res.json();
        return data.success ? data.user : null;
      } catch (err) {
        console.warn('Unable to sync Clerk role', err);
        return null;
      }
    }

    async function updateAuthUI() {
      // Bug fix: Always read from window.Clerk, never the stale local 'clerk' variable.
      var activeClerk = window.Clerk || null;
      var user = activeClerk && activeClerk.user ? activeClerk.user : null;
      var navAuth = document.getElementById('navAuth');
      var navUser = document.getElementById('navUser');
      var navPanel = document.getElementById('nav-panel');
      var userButton = document.getElementById('clerkUserButton');

      if (user) {
        if (navAuth) navAuth.style.display = 'none';
        if (navUser) navUser.style.display = 'flex';
        if (navPanel) navPanel.style.display = 'block';
        if (userButton && !clerkUserButtonMounted && activeClerk.mountUserButton) {
          try { activeClerk.mountUserButton(userButton); clerkUserButtonMounted = true; } catch(e) {}
        }
        var serverUser = null;
        try { serverUser = await fetchSafeClerkUser(); } catch(e) {}
        state.user = {
          id: (serverUser && serverUser.id) || user.id,
          name: (serverUser && serverUser.name) || user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || 'User',
          email: (serverUser && serverUser.email) || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress),
          role: serverUser && serverUser.role,
          savedListings: (state.user && state.user.savedListings) || []
        };
        var sbAdmin = document.getElementById('sb-admin');
        var sbUsers = document.getElementById('sb-users');
        if (sbAdmin) sbAdmin.style.display = isAdminUser() ? 'flex' : 'none';
        if (sbUsers) sbUsers.style.display = isAdminUser() ? 'flex' : 'none';
        var panelPage = document.getElementById('page-panel');
        if (panelPage && panelPage.classList.contains('active')) loadPanelData();
        if (isAdminUser()) loadListings(true);
      } else {
        if (navAuth) navAuth.style.display = 'flex';
        if (navUser) navUser.style.display = 'none';
        if (navPanel) navPanel.style.display = 'none';
        state.user = null;
        state.token = null;
        var sbAdmin2 = document.getElementById('sb-admin');
        var sbUsers2 = document.getElementById('sb-users');
        if (sbAdmin2) sbAdmin2.style.display = 'none';
        if (sbUsers2) sbUsers2.style.display = 'none';
      }
    }

    function openSignIn() {
      var activeClerk = window.Clerk || null;
      if (!activeClerk) {
        console.warn('Clerk not loaded yet');
        return;
      }
      try { activeClerk.openSignIn(); } catch(e) { console.warn('openSignIn error', e); }
    }

    function openSignUp() {
      var activeClerk = window.Clerk || null;
      if (!activeClerk) {
        console.warn('Clerk not loaded yet');
        return;
      }
      try { activeClerk.openSignUp(); } catch(e) { console.warn('openSignUp error', e); }
    }

    function logout() {
      var activeClerk = window.Clerk || null;
      if (activeClerk) {
        activeClerk.signOut().finally(function () {
          updateAuthUI();
          showPage('home');
          showToast('Logged out successfully');
        });
      }
    }
  