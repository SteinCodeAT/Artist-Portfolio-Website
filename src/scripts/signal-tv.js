// Signal TV — interactive project-browser hero.
// Ported from a standalone HTML prototype into a real Astro-bundled module.

// Astro's image pipeline intercepts .png/.jpg/.jpeg imports anywhere in the
// project (not just .astro files) and hands back an { src, width, height,
// format } object rather than a plain URL string — so every image import
// here needs its .src pulled out. The .mp3 import is unaffected (audio isn't
// an extension Astro's image integration claims) and is already a string.
// Per-project background images used to be individual imports here — they're
// CMS-driven now (SignalTV.astro embeds the whole channel list, background
// URLs included, as JSON — see #projectsData below), so only the shared tree
// artwork and the one real audio file (Ghostbox) stay as build-time imports.
import treeMeta from '../img/Tree.png';
import ghostboxAudioUrl from '../audio/ghostbox-audio.mp3';

var treeUrl = treeMeta.src;

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tv = document.getElementById('tv');
  var treeSrc = treeUrl;

  // ---- grain tile ----
  var gc = document.createElement('canvas');
  gc.width = gc.height = 140;
  var gctx = gc.getContext('2d');
  var imgData = gctx.createImageData(140, 140);
  for (var i = 0; i < imgData.data.length; i += 4) {
    var v = Math.random() * 255;
    imgData.data[i] = v; imgData.data[i+1] = v; imgData.data[i+2] = v; imgData.data[i+3] = 255;
  }
  gctx.putImageData(imgData, 0, 0);
  document.documentElement.style.setProperty('--grain-tile', 'url(' + gc.toDataURL() + ')');

  // ---- starfield ----
  var canvas = document.getElementById('stars');
  var ctx = canvas.getContext('2d');
  var stars = [];
  function resizeStars() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    var count = Math.floor((canvas.width * canvas.height) / 7500);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*1.4*devicePixelRatio+0.3, phase: Math.random()*Math.PI*2, speed: 0.4+Math.random()*0.8 });
    }
  }
  function drawStars(t) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (var i=0;i<stars.length;i++) {
      var s = stars[i];
      var tw = reduceMotion ? 0.8 : 0.5 + Math.sin(t*0.001*s.speed + s.phase)*0.5;
      ctx.globalAlpha = 0.2 + tw*0.75;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(drawStars);
  }
  window.addEventListener('resize', resizeStars);
  resizeStars();
  requestAnimationFrame(drawStars);

  // ---- LED text: dead-pixel / dropout flicker, applied to both name + logo ----
  function spawnDeadPixels(el) {
    el.querySelectorAll('.dead-pixel').forEach(function (n) { n.remove(); });
    var count = 1 + Math.floor(Math.random() * 3);
    var rect = el.getBoundingClientRect();
    for (var i = 0; i < count; i++) {
      var d = document.createElement('span');
      d.className = 'dead-pixel';
      d.style.left = Math.random() * rect.width + 'px';
      d.style.top = (Math.random() * 0.8) * rect.height + 'px';
      d.style.width = (2 + Math.random() * 6) + 'px';
      d.style.height = (rect.height * 0.5) + 'px';
      el.appendChild(d);
    }
  }
  function scheduleLedGlitch(el, minDelay, maxDelay) {
    var delay = minDelay + Math.random() * (maxDelay - minDelay);
    setTimeout(function () {
      if (!reduceMotion) {
        spawnDeadPixels(el);
        el.style.opacity = Math.random() > 0.5 ? '0.2' : '1';
        setTimeout(function () {
          el.querySelectorAll('.dead-pixel').forEach(function (n) { n.remove(); });
          el.style.opacity = '1';
        }, 80 + Math.random() * 150);
      }
      scheduleLedGlitch(el, minDelay, maxDelay);
    }, delay);
  }
  if (!reduceMotion) {
    scheduleLedGlitch(document.getElementById('ledLogo'), 1600, 3000);
  }

  // ---- Artist name: old-school broken-marquee, each letter its own failing bulb ----
  var artistNameEl = document.getElementById('artistName');
  (function () {
    var text = artistNameEl.textContent;
    artistNameEl.innerHTML = '';
    var letters = [];
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'letter';
      span.textContent = text[i] === ' ' ? ' ' : text[i];
      artistNameEl.appendChild(span);
      if (text[i] !== ' ') letters.push(span);
    }

    function glitchRandomLetters() {
      if (!reduceMotion) {
        var n = 1 + Math.floor(Math.random() * 2);
        var chosen = [];
        for (var k = 0; k < n; k++) chosen.push(letters[Math.floor(Math.random() * letters.length)]);
        var states = ['led-dim', 'led-dead', 'led-hot'];
        chosen.forEach(function (span) {
          var state = states[Math.floor(Math.random() * states.length)];
          span.classList.add(state);
          setTimeout(function () { span.classList.remove(state); }, 100 + Math.random() * 400);
        });
      }
      setTimeout(glitchRandomLetters, 700 + Math.random() * 1600);
    }
    glitchRandomLetters();
  })();

  // ---- project data — read from the JSON SignalTV.astro embedded, computed
  // server-side (build time) from the CMS's published projects. See that
  // file for how hue/synth/bg are derived per project. ----
  var projectsDataEl = document.getElementById('projectsData');
  var projects = projectsDataEl ? JSON.parse(projectsDataEl.textContent) : [];

  var activeIndex = 0;
  var listEl = document.getElementById('projectList');
  var listWrap = document.getElementById('listWrap');
  var stageImg = document.getElementById('stageImg');
  var ghostR = document.getElementById('ghostR');
  var ghostB = document.getElementById('ghostB');
  var glowA = document.getElementById('glowA');
  var glowB = document.getElementById('glowB');
  var descTitle = document.getElementById('descTitle');
  var descMeta = document.getElementById('descMeta');
  var descBody = document.getElementById('descBody');
  var tear1 = document.getElementById('tear1');
  var tear2 = document.getElementById('tear2');
  var bgPhoto = document.getElementById('bgPhoto');
  var bgPhotoR = document.getElementById('bgPhotoR');
  var bgPhotoB = document.getElementById('bgPhotoB');
  var statChannel = document.getElementById('statChannel');
  var statSignal = document.getElementById('statSignal');
  var statFreq = document.getElementById('statFreq');
  var audioToggle = document.getElementById('audioToggle');
  var audioEl = document.getElementById('audioEl');
  audioEl.src = ghostboxAudioUrl;
  var treeParallax = document.getElementById('treeParallax');

  [stageImg, ghostR, ghostB, glowA, glowB].forEach(function (el) { el.src = treeSrc; });

  var treeTint = document.getElementById('treeTint');
  treeTint.style.webkitMaskImage = 'url(' + treeSrc + ')';
  treeTint.style.maskImage = 'url(' + treeSrc + ')';

  var ROW_H = 34, VISIBLE = 5;

  function renderList() {
    listEl.innerHTML = '';
    projects.forEach(function (p, i) {
      var li = document.createElement('li');
      li.textContent = p.num + ' / ' + p.title.toUpperCase();
      if (i === activeIndex) {
        li.className = 'active';
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = '(On Air)';
        li.appendChild(tag);
      }
      li.addEventListener('click', function () { selectProject(i); });
      li.addEventListener('mouseenter', function () { playTick(520 + i * 45); });
      listEl.appendChild(li);
    });
    var offset = Math.min(Math.max(activeIndex - Math.floor(VISIBLE / 2), 0), Math.max(projects.length - VISIBLE, 0));
    listEl.style.transform = 'translateY(' + (-offset * ROW_H) + 'px)';
  }

  var seeMore = document.getElementById('seeMore');

  function renderDesc(p) {
    descTitle.textContent = p.title;
    descMeta.textContent = p.year;
    descBody.textContent = p.desc;
    seeMore.href = '/projects/' + p.slug;
  }

  function applyHue(p) {
    tv.style.setProperty('--hue', p.hue + 'deg');
    tv.style.setProperty('--hue-num', p.hue);
    treeTint.style.opacity = p.native ? '0' : '0.8';

    if (p.bg) {
      bgPhoto.style.backgroundImage = 'url(' + p.bg + ')';
      bgPhotoR.style.backgroundImage = 'url(' + p.bg + ')';
      bgPhotoB.style.backgroundImage = 'url(' + p.bg + ')';
      bgPhoto.style.opacity = '';
    } else {
      // No documentation photo for this project yet — fall back to the plain nebula.
      bgPhoto.style.backgroundImage = 'none';
      bgPhotoR.style.backgroundImage = 'none';
      bgPhotoB.style.backgroundImage = 'none';
      bgPhoto.style.opacity = '0';
    }
  }

  function fireTears() {
    [tear1, tear2].forEach(function (t) {
      var h = 6 + Math.random() * 26;
      var top = Math.random() * 90;
      t.style.top = top + '%';
      t.style.height = h + 'px';
      t.style.backgroundImage = 'url(' + treeSrc + ')';
      t.style.backgroundSize = stageImg.offsetWidth + 'px auto';
      t.style.backgroundPosition = 'center ' + top + '%';
      t.style.transform = 'translateX(' + (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 60) + 'px)';
    });
  }

  var burstTimeout;
  function burst(duration) {
    if (reduceMotion) return;
    fireTears();
    tv.classList.add('burst', 'roll');
    clearTimeout(burstTimeout);
    burstTimeout = setTimeout(function () { tv.classList.remove('burst', 'roll'); }, duration || 220);
  }

  function selectProject(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    var p = projects[i];
    renderList();
    renderDesc(p);
    playStatic();
    burst(240);

    statChannel.textContent = p.num + ' / ' + projects.length;

    setTimeout(function () { applyHue(p); }, 60);

    // Every channel has audio now (the real file for Ghostbox, a synthesized
    // soundscape for everything else) — stop whatever was playing and let
    // the visitor start the new channel's sound themselves.
    safePause();
    stopSynth();
    audioToggle.disabled = false;
    audioToggle.textContent = '▶ SIGNAL';
  }

  listWrap.addEventListener('wheel', function (e) {
    e.preventDefault();
    var dir = e.deltaY > 0 ? 1 : -1;
    var next = Math.min(Math.max(activeIndex + dir, 0), projects.length - 1);
    if (next !== activeIndex) selectProject(next);
  }, { passive: false });

  // Touch/pen devices never fire "wheel" — drag the list with Pointer Events
  // instead, stepping one channel per row-height dragged.
  var touchDrag = null;
  listWrap.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    touchDrag = { id: e.pointerId, lastY: e.clientY };
    listWrap.setPointerCapture(e.pointerId);
  });
  listWrap.addEventListener('pointermove', function (e) {
    if (!touchDrag || e.pointerId !== touchDrag.id) return;
    var delta = e.clientY - touchDrag.lastY;
    if (Math.abs(delta) < ROW_H) return;
    var dir = delta > 0 ? -1 : 1;
    var next = Math.min(Math.max(activeIndex + dir, 0), projects.length - 1);
    if (next !== activeIndex) selectProject(next);
    touchDrag.lastY = e.clientY;
  });
  ['pointerup', 'pointercancel'].forEach(function (evt) {
    listWrap.addEventListener(evt, function (e) {
      if (touchDrag && e.pointerId === touchDrag.id) touchDrag = null;
    });
  });

  // ---- interactivity: the tree leans toward the cursor ----
  if (!reduceMotion) {
    window.addEventListener('pointermove', function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      treeParallax.style.transform = 'translate(' + (nx * 16) + 'px, ' + (ny * 10) + 'px) rotate(' + (nx * 1.6) + 'deg)';
    });
  }

  // ---- interactivity: poke the tree/screen directly ----
  var stageEl = document.getElementById('stage');
  stageEl.style.pointerEvents = 'auto';
  stageEl.addEventListener('click', function (e) {
    burst(180);
    playTick(300 + Math.random() * 500);
    // A little spark right where the visitor clicked.
    var spark = document.createElement('div');
    spark.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;background:#fff;' +
      'box-shadow:0 0 12px 4px var(--signal);pointer-events:none;z-index:40;' +
      'left:' + (e.clientX - 3) + 'px;top:' + (e.clientY - 3) + 'px;' +
      'animation:spark-pop 0.5s ease-out forwards;';
    document.body.appendChild(spark);
    setTimeout(function () { spark.remove(); }, 520);
  });

  var sparkStyle = document.createElement('style');
  sparkStyle.textContent = '@keyframes spark-pop { 0%{transform:scale(0.4);opacity:1;} 100%{transform:scale(6);opacity:0;} }';
  document.head.appendChild(sparkStyle);

  // ---- "see more" — a tune-out wipe before handing off to the real project page ----
  var tuneOut = document.getElementById('tuneOut');
  seeMore.addEventListener('click', function (e) {
    e.preventDefault();
    var href = seeMore.href;
    playStatic();
    burst(500);
    tuneOut.classList.add('active');
    setTimeout(function () { window.location.href = href; }, 560);
  });

  // ---- ambient glitch bursts ----
  function scheduleAmbientBurst() {
    var delay = 3200 + Math.random() * 3800;
    setTimeout(function () { burst(140 + Math.random() * 120); scheduleAmbientBurst(); }, delay);
  }
  if (!reduceMotion) scheduleAmbientBurst();

  // ---- audio + analyser + synthesized channel-static ----
  //
  // Important: the AudioContext/MediaElementSource graph must only ever be
  // created from a REAL click (the Signal button). Creating it from a wheel
  // event (e.g. scrolling through channels) can leave it stuck in a
  // "suspended" state in some browsers — the <audio> element then reports
  // playing (currentTime advancing, paused=false) while producing no audible
  // sound at all, since once an element is captured by createMediaElementSource
  // its output only reaches the speakers through that (possibly suspended)
  // context. That silent-but-"playing" state is almost certainly what broke it.
  var audioCtx, analyser, source, dataArray;
  var playPromise = null;

  var activeSynth = null;
  var noiseBufferCache = null;
  var timeDataArray = null;

  function ensureGraph() {
    if (audioCtx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    source = audioCtx.createMediaElementSource(audioEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    timeDataArray = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function getNoiseBuffer() {
    if (noiseBufferCache) return noiseBufferCache;
    var len = audioCtx.sampleRate * 2;
    noiseBufferCache = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    var d = noiseBufferCache.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBufferCache;
  }

  function scheduleTone(freq, dur, type) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.11, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(analyser);
    o.start();
    o.stop(audioCtx.currentTime + dur + 0.05);
  }

  // Every non-Ghostbox channel gets its own small procedurally generated
  // soundscape — there's no real recording for them, so this is the
  // "creative" substitute: a distinct sonic character per project instead of
  // silence or a disabled button.
  function startSynthFor(p) {
    var s = p.synth;
    if (!s) return;

    if (s.mode === 'pulse') {
      var fire = function () {
        var f = s.baseFreq + (s.freqJitter ? (Math.random() - 0.5) * s.freqJitter : 0);
        scheduleTone(f, s.dur || 0.4, s.oscType);
      };
      fire();
      activeSynth = { intervalId: setInterval(fire, s.interval) };
      return;
    }

    var osc = audioCtx.createOscillator();
    osc.type = s.oscType || 'sine';
    osc.frequency.value = s.baseFreq;

    var lfo = audioCtx.createOscillator();
    lfo.frequency.value = s.lfoRate;
    var lfoGain = audioCtx.createGain();
    lfoGain.gain.value = s.lfoDepth;
    lfo.connect(lfoGain).connect(osc.frequency);

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = s.filterFreq || 1000;

    var gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(s.level || 0.05, audioCtx.currentTime + 0.8);

    osc.connect(filter).connect(gain).connect(analyser);

    var noiseSrc = null;
    if (s.noiseAmount) {
      noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = getNoiseBuffer();
      noiseSrc.loop = true;
      var noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = s.noiseFilterFreq || 1500;
      var noiseGain = audioCtx.createGain();
      noiseGain.gain.value = s.noiseAmount;
      noiseSrc.connect(noiseFilter).connect(noiseGain).connect(gain);
      noiseSrc.start();
    }

    osc.start();
    lfo.start();
    activeSynth = { osc: osc, lfo: lfo, gain: gain, noiseSrc: noiseSrc };
  }

  function stopSynth() {
    if (!activeSynth) return;
    var nodes = activeSynth;
    activeSynth = null;
    if (nodes.intervalId) { clearInterval(nodes.intervalId); return; }
    if (nodes.gain) nodes.gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    setTimeout(function () {
      try { nodes.osc && nodes.osc.stop(); } catch (e) {}
      try { nodes.lfo && nodes.lfo.stop(); } catch (e) {}
      try { nodes.noiseSrc && nodes.noiseSrc.stop(); } catch (e) {}
    }, 350);
  }

  function safePause() {
    // Never call pause() while a play() promise is still in flight — that
    // throws "play() request was interrupted by a call to pause()".
    if (playPromise) {
      playPromise.then(function () { audioEl.pause(); }).catch(function () {});
    } else {
      audioEl.pause();
    }
  }

  // A real click/keypress anywhere unlocks the shared AudioContext under a
  // genuine trusted gesture, so hover ticks and ambient interactivity sounds
  // (which aren't gestures themselves) have something running to play through.
  function unlockAudioOnce() {
    ensureGraph();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  document.addEventListener('pointerdown', unlockAudioOnce, { once: true });
  document.addEventListener('keydown', unlockAudioOnce, { once: true });

  function playTick(freq) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq || 700;
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) { /* fail silently */ }
  }

  function playStatic() {
    // Only fire once audio has actually been unlocked by a real click —
    // never create the context from here (see note above).
    if (!audioCtx || audioCtx.state !== 'running') return;
    try {
      var dur = 0.16;
      var bufferSize = Math.floor(audioCtx.sampleRate * dur);
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      var noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      var gain = audioCtx.createGain();
      gain.gain.value = 0.18;
      noise.connect(gain).connect(audioCtx.destination);
      noise.start();
    } catch (e) { /* fail silently */ }
  }

  // Ghostbox's source file has ~2.8s of near-silent lead-in before the real signal.
  var AUDIO_SKIP = 2.8;

  function startPlayback() {
    if (audioEl.currentTime < 0.1) {
      try { audioEl.currentTime = AUDIO_SKIP; } catch (e) { /* metadata not ready yet */ }
    }
    playPromise = audioEl.play();
    if (playPromise) {
      playPromise.catch(function () { audioToggle.textContent = '▶ SIGNAL'; }).finally(function () { playPromise = null; });
    }
    audioToggle.textContent = '⏸ SIGNAL';
  }

  audioToggle.addEventListener('click', function () {
    if (audioToggle.disabled) return;
    ensureGraph();
    var p = projects[activeIndex];

    if (p.hasAudio) {
      if (audioEl.paused) {
        // resume() must actually resolve before play() will be audible —
        // this is the fix for the "plays but silent" bug.
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().then(startPlayback);
        } else {
          startPlayback();
        }
      } else {
        safePause();
        audioToggle.textContent = '▶ SIGNAL';
      }
      return;
    }

    // Synthesized soundscape channel.
    if (activeSynth) {
      stopSynth();
      audioToggle.textContent = '▶ SIGNAL';
    } else {
      var begin = function () { startSynthFor(p); };
      if (audioCtx.state === 'suspended') { audioCtx.resume().then(begin); } else { begin(); }
      audioToggle.textContent = '⏸ SIGNAL';
    }
  });

  audioEl.addEventListener('loadedmetadata', function () {
    if (audioEl.currentTime < 0.1) {
      try { audioEl.currentTime = AUDIO_SKIP; } catch (e) {}
    }
  });

  var barsCanvas = document.getElementById('bars');
  var barsCtx = barsCanvas.getContext('2d');
  var scopeCanvas = document.getElementById('scope');
  var scopeCtx = scopeCanvas.getContext('2d');
  var statCoherence = document.getElementById('statCoherence');
  var statEntropy = document.getElementById('statEntropy');

  function isChannelPlaying() {
    var p = projects[activeIndex];
    return p.hasAudio ? !audioEl.paused : !!activeSynth;
  }

  function drawBars() {
    requestAnimationFrame(drawBars);
    var w = barsCanvas.width, h = barsCanvas.height;
    barsCtx.clearRect(0, 0, w, h);
    barsCtx.fillStyle = 'rgba(228,228,228,0.85)';

    var sw = scopeCanvas.width, sh = scopeCanvas.height;
    scopeCtx.clearRect(0, 0, sw, sh);
    scopeCtx.strokeStyle = '#00c896';
    scopeCtx.lineWidth = 1.5;
    scopeCtx.beginPath();

    var playing = analyser && isChannelPlaying();

    if (playing) {
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDataArray);

      var sum = 0;
      var peakBin = 0, peakVal = 0;
      var barW = w / dataArray.length;
      for (var i = 0; i < dataArray.length; i++) {
        var bh = (dataArray[i] / 255) * h;
        sum += dataArray[i];
        if (dataArray[i] > peakVal) { peakVal = dataArray[i]; peakBin = i; }
        barsCtx.fillRect(i * barW, h - bh, barW - 1, bh);
      }
      var avg = sum / dataArray.length / 255;
      document.documentElement.style.setProperty('--audio-boost', avg.toFixed(3));
      var hz = Math.round((peakBin * audioCtx.sampleRate) / analyser.fftSize);
      statFreq.textContent = hz + ' Hz';
      statSignal.textContent = Math.round(60 + avg * 40) + '%';

      var sliceW = sw / timeDataArray.length;
      for (var j = 0; j < timeDataArray.length; j++) {
        var v = timeDataArray[j] / 128 - 1;
        var y = sh / 2 + v * (sh / 2 - 2);
        if (j === 0) scopeCtx.moveTo(0, y); else scopeCtx.lineTo(j * sliceW, y);
      }
    } else {
      barsCtx.globalAlpha = 0.35;
      barsCtx.fillRect(0, h / 2 - 1, w, 1);
      barsCtx.globalAlpha = 1;
      document.documentElement.style.setProperty('--audio-boost', 0);
      statFreq.textContent = '— Hz';
      if (Math.random() < 0.03) statSignal.textContent = (92 + Math.floor(Math.random() * 7)) + '%';

      // Idle ambient trace — decorative, not real data, so the panel never looks dead.
      var t = Date.now() * 0.002;
      for (var k = 0; k < sw; k++) {
        var yy = sh / 2 + Math.sin(k * 0.15 + t) * (sh * 0.14) + Math.sin(k * 0.05 - t * 1.7) * (sh * 0.08);
        if (k === 0) scopeCtx.moveTo(k, yy); else scopeCtx.lineTo(k, yy);
      }
    }
    scopeCtx.stroke();
  }
  requestAnimationFrame(drawBars);

  // Quantum-flavored flavor stats — a random walk, not real telemetry, but
  // it should never sit still.
  var coherence = 0.71, entropy = 2.3;
  setInterval(function () {
    coherence = Math.min(0.99, Math.max(0.2, coherence + (Math.random() - 0.5) * 0.06));
    entropy = Math.min(9.9, Math.max(0.5, entropy + (Math.random() - 0.5) * 0.4));
    statCoherence.textContent = coherence.toFixed(2) + ' φ';
    statEntropy.textContent = entropy.toFixed(1) + 'e³';
  }, 900);

  // ---- fake running timecode ----
  var start = Date.now();
  var tc = document.getElementById('timecode');
  setInterval(function () {
    var el = Math.floor((Date.now() - start) / 1000);
    var hh = String(Math.floor(el/3600)).padStart(2,'0');
    var mm = String(Math.floor((el%3600)/60)).padStart(2,'0');
    var ss = String(el%60).padStart(2,'0');
    var ff = String(Math.floor((Date.now()-start)/41)%25).padStart(2,'0');
    tc.textContent = hh+':'+mm+':'+ss+':'+ff;
  }, 80);

  // ---- init ----
  renderList();
  renderDesc(projects[0]);
  applyHue(projects[0]);
  statChannel.textContent = projects[0].num + ' / ' + projects.length;
