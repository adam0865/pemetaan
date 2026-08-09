/* Peta Interaktif Desa Cimenteng - Versi Supabase */
(function() {
  "use strict";

  var PLACES = [];
  var CATS = [];
  var map;
  var markers = {};
  var activeCat = null;
  var activePlace = null;
  var activePhoto = null;
  var userLocation = null;
  var routeLayer = null;

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }

  function getCat(key) {
    for (var i = 0; i < CATS.length; i++) {
      if (CATS[i].key === key) return CATS[i];
    }
    return { key: key, label: key || "Lokasi", icon: "fa-map-pin", color: "#60a5fa" };
  }

  function slugify(value) {
    return String(value || "lainnya").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "lainnya";
  }

  function palette(index) {
    var colors = ["#22c55e", "#14b8a6", "#f59e0b", "#60a5fa", "#ef4444", "#a855f7", "#06b6d4", "#84cc16"];
    return colors[index % colors.length];
  }

  /**
   * Build categories from API response or fallback
   * API returns: [{id, name, icon, color}]
   * We convert to: [{key, label, icon, color}]
   */
  function buildCategories(apiCategories) {
    var result = [];
    var map = {};

    if (apiCategories && apiCategories.length > 0) {
      // Use API categories
      for (var i = 0; i < apiCategories.length; i++) {
        var apiCat = apiCategories[i];
        var key = slugify(apiCat.name);
        result.push({
          key: key,
          label: apiCat.name,
          icon: apiCat.icon || "fa-map-pin",
          color: apiCat.color || palette(result.length)
        });
        map[key] = true;
      }
    } else {
      // Fallback to data.js CATEGORIES
      for (var j = 0; j < CATEGORIES.length; j++) {
        map[CATEGORIES[j].key] = true;
        result.push(CATEGORIES[j]);
      }
    }

    // Add any categories from places that aren't in the list
    for (var k = 0; k < PLACES.length; k++) {
      var place = PLACES[k];
      var label = place.categoryLabel || (place.categories && place.categories.name) || place.category || "Lainnya";
      var pkey = slugify(label);
      place.category = pkey;
      place.categoryLabel = label;
      if (!map[pkey]) {
        map[pkey] = true;
        var catIcon = place.categoryIcon || (place.categories && place.categories.icon) || "fa-map-pin";
        var catColor = place.categoryColor || (place.categories && place.categories.color) || palette(result.length);
        result.push({
          key: pkey,
          label: label,
          icon: catIcon,
          color: catColor
        });
      }
    }

    return result;
  }

  /**
   * Normalize API location to internal place format
   */
  function normalizePlace(apiPlace) {
    var cat = apiPlace.categories || {};
    return {
      id: String(apiPlace.id),
      name: apiPlace.name,
      category: cat.name ? slugify(cat.name) : (apiPlace.category || "lainnya"),
      categoryLabel: cat.name || apiPlace.category || "Lainnya",
      categoryIcon: cat.icon || "fa-map-pin",
      categoryColor: cat.color || "#22c55e",
      lat: apiPlace.latitude,
      lng: apiPlace.longitude,
      description: apiPlace.description || "",
      address: apiPlace.address || "",
      mapLink: apiPlace.google_maps_url || "",
      photo: apiPlace.photo_url || "",
      photos: apiPlace.photo_url ? [apiPlace.photo_url] : [],
      createdAt: apiPlace.created_at,
      updatedAt: apiPlace.updated_at
    };
  }

  function getPhotos(place) {
    if (Array.isArray(place.photos) && place.photos.length) return place.photos.filter(Boolean);
    return place.photo ? [place.photo] : [];
  }

  function getAllPhotos() {
    var out = [];
    for (var i = 0; i < PLACES.length; i++) {
      var photos = getPhotos(PLACES[i]);
      for (var j = 0; j < photos.length; j++) {
        out.push({ place: PLACES[i], src: photos[j], index: j });
      }
    }
    return out;
  }

  function makeIcon(cat) {
    var meta = getCat(cat);
    return L.divIcon({
      className: "",
      html: '<div class="marker-pin" style="--marker-color:' + esc(meta.color) + '"><i class="fas ' + esc(meta.icon) + '"></i></div>',
      iconSize: [38, 42],
      iconAnchor: [19, 42],
      popupAnchor: [0, -40]
    });
  }

  function buildMapsLink(place) {
    if (place.mapLink) return place.mapLink;
    if (place.lat && place.lng) return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.lat + "," + place.lng);
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.name || "Desa Cimenteng");
  }

  function showInfo(place, selectedPhoto) {
    activePlace = place;
    activePhoto = selectedPhoto || getPhotos(place)[0] || "";

    var meta = getCat(place.category);
    var title = $("info-title");
    var content = $("info-content");
    var actions = $("info-actions");
    var panel = $("info-panel");
    if (!title || !content || !actions || !panel) return;

    title.textContent = place.name || "Detail Tempat";
    var photoHtml = activePhoto
      ? '<div class="info-photo"><img src="' + esc(activePhoto) + '" alt="' + esc(place.name || "Foto lokasi") + '"></div>'
      : '<div class="info-photo-empty"><i class="fas fa-image"></i></div>';

    var metaHtml = '<div class="info-category"><i class="fas ' + esc(meta.icon) + '" style="color:' + esc(meta.color) + '"></i> ' + esc(meta.label) + '</div>';

    if (place.description) {
      metaHtml += '<div class="info-desc">' + esc(place.description) + '</div>';
    }

    if (place.address) {
      metaHtml += '<div class="info-sub"><i class="fas fa-map-marker-alt"></i> ' + esc(place.address) + '</div>';
    }

    content.innerHTML = photoHtml + '<div class="info-meta" style="--cat-color:' + esc(meta.color) + '">' + metaHtml + '</div>';

    actions.innerHTML =
      '<a class="btn primary" href="' + esc(buildMapsLink(place)) + '" target="_blank" rel="noopener">' +
        '<i class="fas fa-external-link-alt"></i> Buka Google Maps' +
      '</a>' +
      '<button class="btn" id="route-active-place" type="button">' +
        '<i class="fas fa-route"></i> Arahkan' +
      '</button>';
    var routeBtn = $("route-active-place");
    if (routeBtn) routeBtn.onclick = function() { routeToPlace(place); };

    panel.classList.remove("hidden");
  }

  function focusPlace(place, selectedPhoto) {
    if (!place || !map) return;
    showInfo(place, selectedPhoto);
    if (place.lat && place.lng) {
      map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
      if (markers[place.id]) markers[place.id].openPopup();
    }
    highlightPhoto(place, selectedPhoto);
  }

  function highlightPhoto(place, src) {
    var buttons = document.querySelectorAll(".photo-card");
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].getAttribute("data-place-id") === String(place.id) &&
        (!src || buttons[i].getAttribute("data-src") === src);
      buttons[i].classList.toggle("active", isActive);
    }
  }

  function renderPhotoDock() {
    var dock = $("photo-dock");
    var strip = $("photo-strip");
    var count = $("photo-dock-count");
    if (!dock || !strip || !count) return;

    var photos = getAllPhotos();
    count.textContent = photos.length + " foto";
    strip.innerHTML = "";

    if (!photos.length) {
      dock.classList.add("hidden");
      return;
    }

    dock.classList.remove("hidden");
    for (var i = 0; i < photos.length; i++) {
      var item = photos[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo-card";
      btn.setAttribute("data-place-id", item.place.id);
      btn.setAttribute("data-src", item.src);
      btn.innerHTML =
        '<img src="' + esc(item.src) + '" alt="' + esc(item.place.name) + '">' +
        '<span>' + esc(item.place.name) + '</span>';
      (function(place, src) {
        btn.onclick = function() { focusPlace(place, src); };
      })(item.place, item.src);
      strip.appendChild(btn);
    }

    var allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "photo-card photo-card-all";
    allBtn.innerHTML = '<i class="fas fa-images"></i><span>Lihat semua foto</span>';
    allBtn.onclick = openPhotoModal;
    strip.appendChild(allBtn);
  }

  function openPhotoModal() {
    var modal = $("photo-modal");
    var grid = $("photo-modal-grid");
    if (!modal || !grid) return;
    var photos = getAllPhotos();
    grid.innerHTML = "";
    for (var i = 0; i < photos.length; i++) {
      var item = photos[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo-modal-item";
      btn.innerHTML =
        '<img src="' + esc(item.src) + '" alt="' + esc(item.place.name) + '">' +
        '<span>' + esc(item.place.name) + '</span>';
      (function(place, src) {
        btn.onclick = function() {
          closePhotoModal();
          focusPlace(place, src);
        };
      })(item.place, item.src);
      grid.appendChild(btn);
    }
    modal.classList.remove("hidden");
  }

  function closePhotoModal() {
    var modal = $("photo-modal");
    if (modal) modal.classList.add("hidden");
  }

  function renderFilters() {
    var cc = $("category-filters");
    if (!cc) return;
    cc.innerHTML = "";

    var all = document.createElement("button");
    all.type = "button";
    all.className = "chip active";
    all.textContent = "Semua";
    all.onclick = function() {
      activeCat = null;
      setActiveChip(cc, all);
      filterMarkers();
    };
    cc.appendChild(all);

    for (var i = 0; i < CATS.length; i++) {
      var cat = CATS[i];
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.innerHTML = '<i class="fas ' + esc(cat.icon) + '" style="color:' + esc(cat.color) + '"></i> ' + esc(cat.label);
      (function(key, el) {
        el.onclick = function() {
          activeCat = key;
          setActiveChip(cc, el);
          filterMarkers();
        };
      })(cat.key, chip);
      cc.appendChild(chip);
    }
  }

  function setActiveChip(parent, el) {
    var chips = parent.querySelectorAll(".chip");
    for (var i = 0; i < chips.length; i++) chips[i].classList.remove("active");
    el.classList.add("active");
  }

  function renderStats() {
    var sg = $("stats-grid");
    if (!sg) return;
    sg.innerHTML = "";
    var cards = [{ n: PLACES.length, t: "Total Tempat" }];
    for (var i = 0; i < CATS.length; i++) {
      var count = 0;
      for (var j = 0; j < PLACES.length; j++) if (PLACES[j].category === CATS[i].key) count++;
      cards.push({ n: count, t: CATS[i].label });
    }
    for (var k = 0; k < cards.length; k++) {
      var div = document.createElement("div");
      div.className = "stat-card";
      div.innerHTML = '<div class="num">' + cards[k].n + '</div><div class="lbl">' + esc(cards[k].t) + '</div>';
      sg.appendChild(div);
    }
  }

  function renderLegend() {
    var lg = $("legend-items");
    if (!lg) return;
    lg.innerHTML = "";
    for (var i = 0; i < CATS.length; i++) {
      var cat = CATS[i];
      var count = 0;
      for (var j = 0; j < PLACES.length; j++) if (PLACES[j].category === cat.key) count++;
      var item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML =
        '<div class="legend-left">' +
          '<div class="legend-badge" style="border-color:' + esc(cat.color) + '55"><i class="fas ' + esc(cat.icon) + '" style="color:' + esc(cat.color) + '"></i></div>' +
          '<div class="legend-label">' + esc(cat.label) + '</div>' +
        '</div>' +
        '<div class="legend-count">' + count + '</div>';
      lg.appendChild(item);
    }
  }

  function filterMarkers() {
    for (var i = 0; i < PLACES.length; i++) {
      var place = PLACES[i];
      var marker = markers[place.id];
      if (!marker) continue;
      var visible = !activeCat || place.category === activeCat;
      if (visible && !map.hasLayer(marker)) marker.addTo(map);
      if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
    }
  }

  function haversine(a, b) {
    var R = 6371;
    var dLat = (b[0] - a[0]) * Math.PI / 180;
    var dLng = (b[1] - a[1]) * Math.PI / 180;
    var lat1 = a[0] * Math.PI / 180;
    var lat2 = b[0] * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function setupEvents(polygon) {
    var el = $("sidebar-toggle");
    if (el) el.onclick = function() {
      var sidebar = $("sidebar");
      var backdrop = $("sidebar-backdrop");
      if (!sidebar) return;
      sidebar.classList.toggle("hidden-sidebar");
      if (backdrop) backdrop.classList.toggle("visible", !sidebar.classList.contains("hidden-sidebar"));
    };
    el = $("close-sidebar");
    if (el) el.onclick = function() {
      var sidebar = $("sidebar");
      var backdrop = $("sidebar-backdrop");
      if (sidebar) sidebar.classList.add("hidden-sidebar");
      if (backdrop) backdrop.classList.remove("visible");
    };
    el = $("close-info");
    if (el) el.onclick = function() { $("info-panel").classList.add("hidden"); };
    el = $("zoom-in");
    if (el) el.onclick = function() { map.zoomIn(); };
    el = $("zoom-out");
    if (el) el.onclick = function() { map.zoomOut(); };
    el = $("go-cimenteng");
    if (el) el.onclick = function() {
      if (polygon && polygon.length) map.flyToBounds(L.latLngBounds(polygon), { padding: [20, 20], duration: 0.9 });
    };
    el = $("theme-toggle");
    if (el) el.onclick = function() { document.body.classList.toggle("theme-light"); };
    el = $("photo-dock-close");
    if (el) el.onclick = function() { $("photo-dock").classList.add("hidden"); };
    el = $("photo-modal-close");
    if (el) el.onclick = closePhotoModal;
    el = $("photo-modal");
    if (el) el.onclick = function(e) { if (e.target === e.currentTarget) closePhotoModal(); };

    // Backdrop click: close sidebar
    el = $("sidebar-backdrop");
    if (el) el.onclick = function() {
      var sidebar = $("sidebar");
      if (sidebar) sidebar.classList.add("hidden-sidebar");
      el.classList.remove("visible");
    };

    el = $("locate-btn");
    if (el) el.onclick = function() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function(pos) {
        userLocation = [pos.coords.latitude, pos.coords.longitude];
        map.setView(userLocation, 16, { animate: true });
        L.circleMarker(userLocation, {
          radius: 10,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.35
        }).addTo(map).bindTooltip("Lokasi Saya").openTooltip();
      });
    };

    el = $("fab-main");
    if (el) el.onclick = function() {
      var fb = $("fab-options");
      if (!fb) return;
      fb.setAttribute("aria-hidden", fb.getAttribute("aria-hidden") === "true" ? "false" : "true");
    };

    var fabOptions = document.querySelectorAll(".fab-option");
    for (var i = 0; i < fabOptions.length; i++) {
      fabOptions[i].onclick = function() {
        if (this.dataset.action === "nearby") focusNearestPlace();
        if (this.dataset.action === "directions" && activePlace) routeToPlace(activePlace);
      };
    }

    el = $("layers-btn");
    if (el) el.onclick = function() { $("layer-panel").classList.toggle("hidden"); };
    var opts = document.querySelectorAll(".layer-option");
    for (var j = 0; j < opts.length; j++) {
      (function(opt) {
        opt.onclick = function() {
          var layers = {
            osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }),
            satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18 }),
            topographic: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17 }),
            dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 })
          };
          map.eachLayer(function(layer) { if (layer instanceof L.TileLayer) map.removeLayer(layer); });
          if (layers[opt.dataset.layer]) layers[opt.dataset.layer].addTo(map);
          for (var x = 0; x < opts.length; x++) opts[x].classList.toggle("active", opts[x] === opt);
          $("layer-panel").classList.add("hidden");
        };
      })(opts[j]);
    }
  }

  function focusNearestPlace() {
    var origin = userLocation || [MAP_CENTER[0], MAP_CENTER[1]];
    var best = null;
    var bestDistance = Infinity;
    for (var i = 0; i < PLACES.length; i++) {
      var p = PLACES[i];
      if (!p.lat || !p.lng) continue;
      var distance = haversine(origin, [p.lat, p.lng]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = p;
      }
    }
    if (best) focusPlace(best);
  }

  function routeToPlace(place) {
    if (!place || !place.lat || !place.lng) return;
    function drawRoute(from) {
      var to = [place.lat, place.lng];
      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.polyline([from, to], {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
        dashArray: "10 8"
      }).addTo(map);
      L.circleMarker(from, {
        radius: 8,
        color: "#2563eb",
        fillColor: "#60a5fa",
        fillOpacity: 0.45
      }).addTo(map).bindTooltip("Titik awal").openTooltip();
      map.flyToBounds(L.latLngBounds([from, to]), { padding: [80, 80], duration: 0.8 });
    }
    if (userLocation) {
      drawRoute(userLocation);
      return;
    }
    if (!navigator.geolocation) {
      drawRoute(MAP_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
      userLocation = [pos.coords.latitude, pos.coords.longitude];
      drawRoute(userLocation);
    }, function() {
      drawRoute(MAP_CENTER);
    });
  }

  /**
   * Initialize map with data from Supabase API
   */
  function boot() {
    try {
      var app = $("app");
      var loading = $("loading-screen");
      var center = MAP_CENTER || [-6.973361184, 107.056683037];
      var polygon = CIMENTENG_POLYGON || [];
      var bounds = polygon.length >= 3 ? L.latLngBounds(polygon) : null;

      map = L.map("map", {
        zoomControl: false,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
      }).setView(center, 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "" }).addTo(map);

      if (bounds) {
        // Mask layer: world polygon with village polygon as hole
        var worldBounds = [
          [-90, -180], [90, -180], [90, 180], [-90, 180]
        ];
        var maskPolygon = L.polygon([worldBounds, polygon], {
          color: "transparent",
          weight: 0,
          fillColor: "rgba(0,0,0,0.4)",
          fillOpacity: 0.6,
          fillRule: "evenodd"
        }).addTo(map);

        L.polygon(polygon, {
          color: "#ef4444",
          weight: 2,
          opacity: 0.95,
          dashArray: "4 6",
          fillColor: "#22c55e",
          fillOpacity: 0.06
        }).addTo(map);

        map.fitBounds(bounds, { padding: [20, 20] });
      }

      // Fetch locations and categories from API
      Promise.all([
        CimentengAPI ? CimentengAPI.getLocations().catch(function() { return { success: false, data: [] }; }) : Promise.resolve({ success: false, data: [] }),
        CimentengAPI ? CimentengAPI.getCategories().catch(function() { return { success: false, data: [] }; }) : Promise.resolve({ success: false, data: [] })
      ]).then(function(results) {
        var locationsResult = results[0];
        var categoriesResult = results[1];

        // Process locations
        if (locationsResult && locationsResult.success && locationsResult.data) {
          PLACES = locationsResult.data.map(normalizePlace);
        } else {
          PLACES = [];
          console.warn('Failed to load locations from API, showing empty map');
        }

        // Process categories
        var apiCategories = [];
        if (categoriesResult && categoriesResult.success && categoriesResult.data) {
          apiCategories = categoriesResult.data;
        }

        // Build category list
        CATS = buildCategories(apiCategories);

        // Render markers
        for (var i = 0; i < PLACES.length; i++) {
          var place = PLACES[i];
          if (!place.lat || !place.lng) continue;
          var marker = L.marker([place.lat, place.lng], { icon: makeIcon(place.category) }).addTo(map);
          marker.bindPopup("<b>" + esc(place.name) + "</b><br><small>" + esc(place.categoryLabel) + "</small>");
          (function(p) {
            marker.on("click", function() { focusPlace(p); });
          })(place);
          markers[place.id] = marker;
        }

        // Render UI components
        renderFilters();
        renderStats();
        renderLegend();
        renderPhotoDock();
        setupEvents(polygon);

        // Show app, hide loading
        setTimeout(function() {
          if (app) app.classList.remove("hidden");
          if (loading) loading.classList.add("hidden");
          map.invalidateSize();
          if (bounds) {
            map.setMinZoom(map.getBoundsZoom(bounds, false));
          }
        }, 1200);

      }).catch(function(err) {
        console.error('Error loading data:', err);
        // Still show the map even if API fails
        CATS = buildCategories(null); // Use fallback
        setTimeout(function() {
          if (app) app.classList.remove("hidden");
          if (loading) loading.classList.add("hidden");
          map.invalidateSize();
        }, 1200);
      });

    } catch (e) {
      console.error(e);
      var loading = $("loading-screen");
      if (loading) loading.innerHTML = '<span style="color:#ef4444">Error: ' + esc(e.message) + '</span>';
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
