
let loadedImages = [];
let remixReady = false;
let cnv;
let lastGeneratedImage = null;
let highResImage = null;

function getCanvasSize() {
  const maxWidth = Math.min(window.innerWidth * 0.9, 800);
  const maxHeight = Math.min(window.innerHeight * 0.6, 600);
  const size = Math.min(maxWidth, maxHeight);
  return size;
}

function setup() {
  const canvasSize = getCanvasSize();
  cnv = createCanvas(canvasSize, canvasSize);
  cnv.parent("canvasContainer");
  noLoop();
  background(20);

  fill(40);
  noStroke();
  rect(50, 50, width-100, height-100, 10);
  fill(100);
  textAlign(CENTER, CENTER);
  textSize(16);
  text("Canvas pronto para suas imagens", width/2, height/2);
}

function windowResized() {
  const canvasSize = getCanvasSize();
  resizeCanvas(canvasSize, canvasSize);

  if (lastGeneratedImage) {
    background(20);
    image(lastGeneratedImage, 0, 0, width, height);
    updateStatus("Canvas redimensionado - imagem mantida");
  } else if (loadedImages.length === 0) {
    background(20);
    fill(40);
    noStroke();
    rect(50, 50, width-100, height-100, 10);
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("Canvas redimensionado", width/2, height/2);
  }
}

document.getElementById("imageInput").addEventListener("change", handleImageUpload);
document.getElementById("remixButton").addEventListener("click", remixImages);

function updateStatus(message) {
  document.getElementById("status").textContent = message;
}

function handleImageUpload(event) {
  loadedImages = [];
  const files = event.target.files;
  const button = document.getElementById("remixButton");

  if (files.length === 0) {
    button.disabled = true;
    updateStatus("Selecione imagens para começar");
    return;
  }

  updateStatus(\`Carregando \${files.length} imagem(ns)...\`);
  button.disabled = true;

  let count = 0;
  for (let file of files) {
    const reader = new FileReader();
    reader.onload = function (e) {
      loadImage(e.target.result, (img) => {
        loadedImages.push(img);
        count++;
        updateStatus(\`Carregadas \${count}/\${files.length} imagens\`);
        if (count === files.length) {
          remixReady = true;
          button.disabled = false;
          updateStatus(\`\${files.length} imagem(ns) prontas para remix!\`);
        }
      });
    };
    reader.readAsDataURL(file);
  }
}

function blendImagesSmart(targetWidth = width, targetHeight = height) {
  let combined = createGraphics(targetWidth, targetHeight);
  combined.background(20);

  for (let i = 0; i < loadedImages.length; i++) {
    let img = loadedImages[i];
    let scaleFactor = Math.min(targetWidth / img.width, targetHeight / img.height) * 0.8;
    let imgW = img.width * scaleFactor;
    let imgH = img.height * scaleFactor;

    for (let j = 0; j < 4; j++) {
      let maskType = floor(random(4));
      if (maskType === 0) {
        combined.push();
        combined.translate(random(targetWidth), random(targetHeight));
        combined.beginClip();
        combined.ellipse(0, 0, random(80, 300));
        combined.endClip();
        combined.image(img, -imgW / 2, -imgH / 2, imgW, imgH);
        combined.pop();
      } else if (maskType === 1) {
        let x = floor(random(targetWidth - 100));
        let sliceWidth = random(20, 100);
        combined.copy(img, x, 0, sliceWidth, img.height,
                     x + random(-30, 30), 0, sliceWidth, targetHeight);
      } else if (maskType === 2) {
        combined.push();
        combined.translate(random(targetWidth), random(targetHeight));
        combined.rotate(random(-PI / 3, PI / 3));
        combined.tint(255, random(60, 150));
        combined.image(img, -imgW / 2, -imgH / 2, imgW, imgH);
        combined.pop();
      } else {
        let blockW = random(50, 200);
        let blockH = random(50, 200);
        let sx = random(img.width - blockW);
        let sy = random(img.height - blockH);
        let dx = random(targetWidth - blockW);
        let dy = random(targetHeight - blockH);
        combined.copy(img, sx, sy, blockW, blockH, dx, dy, blockW, blockH);
      }
    }
  }

  return combined;
}

function remixImages() {
  if (!remixReady || loadedImages.length === 0) {
    updateStatus("Carregue imagens antes de remixar!");
    return;
  }

  updateStatus("Criando remix...");
  background(20);

  let combined = blendImagesSmart();
  applyGlitch(combined);
  image(combined, 0, 0, width, height);

  updateStatus("Gerando versão em alta resolução...");
  let highResCombined = blendImagesSmart(1920, 1920);
  applyGlitch(highResCombined);

  lastGeneratedImage = combined;
  highResImage = highResCombined;

  updateStatus("Aplicando efeitos glitch...");
  const highResDataURL = highResCombined.elt.toDataURL();
  setupDownloadLink(highResDataURL);

  setTimeout(() => {
    const originalDataURL = cnv.elt.toDataURL();

    window.glitchCanvas({
      amount: random(60, 100),
      quality: random(15, 30),
      seed: Math.floor(Math.random() * 9999),
      iterations: floor(random(8, 15))
    })
    .fromDataURL(originalDataURL)
    .toDataURL()
    .then((glitchedDataURL) => {
      loadImage(glitchedDataURL, (p5img) => {
        background(20);
        image(p5img, 0, 0, width, height);
        lastGeneratedImage = createGraphics(width, height);
        lastGeneratedImage.image(p5img, 0, 0, width, height);
        updateStatus("Remix concluído! Link de download disponível abaixo.");
      });
    })
    .catch((error) => {
      console.error("Erro no glitch:", error);
      updateStatus("Remix concluído! Link de download disponível abaixo.");
    });
  }, 200);
}

function applyGlitch(pg) {
  const w = pg.width;
  const h = pg.height;
  const scaleFactor = w / 800;

  for (let i = 0; i < 60 * scaleFactor; i++) {
    const sx = floor(random(w));
    const sy = floor(random(h));
    const sw = floor(random(10 * scaleFactor, 80 * scaleFactor));
    const sh = floor(random(3 * scaleFactor, 30 * scaleFactor));
    const dx = sx + floor(random(-80 * scaleFactor, 80 * scaleFactor));
    const dy = sy + floor(random(-50 * scaleFactor, 50 * scaleFactor));
    pg.copy(pg, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  for (let i = 0; i < 15 * scaleFactor; i++) {
    let y = floor(random(h));
    let hStrip = floor(random(1, 8 * scaleFactor));
    let offset = floor(random(-100 * scaleFactor, 100 * scaleFactor));
    pg.copy(pg, 0, y, w, hStrip, offset, y, w, hStrip);
  }

  pg.loadPixels();
  for (let i = 0; i < pg.pixels.length; i += 4) {
    if (random() < 0.02) {
      pg.pixels[i] = random(255);
      pg.pixels[i + 1] = random(100);
      pg.pixels[i + 2] = random(255);
    }

    if (random() < 0.05) {
      const noise = random(-40, 40);
      pg.pixels[i] = constrain(pg.pixels[i] + noise, 0, 255);
      pg.pixels[i + 1] = constrain(pg.pixels[i + 1] + noise, 0, 255);
      pg.pixels[i + 2] = constrain(pg.pixels[i + 2] + noise, 0, 255);
    }
  }
  pg.updatePixels();

  for (let i = 0; i < 8 * scaleFactor; i++) {
    let blockSize = floor(random(5 * scaleFactor, 30 * scaleFactor));
    let px = floor(random(0, w - blockSize));
    let py = floor(random(0, h - blockSize));
    pg.noStroke();
    pg.fill(random(255), random(100), random(255), random(100, 200));
    pg.rect(px, py, blockSize, blockSize);
  }
}

function setupDownloadLink(dataURL) {
  const downloadLink = document.getElementById("downloadLink");
  downloadLink.href = dataURL;
  downloadLink.download = `remix-arte-${Date.now()}.png`;
  downloadLink.style.display = "inline-block";
}
