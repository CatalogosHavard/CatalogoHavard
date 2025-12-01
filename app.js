// --- ¡IMPORTANTE! ---
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQrmt-18wJiD1ByYj7Hsd9uUG7d3CQ3FDV4gApN2qI6zLHFRbdnKJgdbK6Y9E1hNJeqJTXe_I9j7fxE/pub?output=tsv';
const API_STOCK_URL = 'https://script.google.com/macros/s/AKfycbzsOB_XdjnyGArMCmd0_X-oGuCl3lOzsmdNCxHLQSo2PKzrReJm4P69xpv07yp9s3CJLw/exec';
// ---------------------

// Función para colores y tachado (MOVIDA AL INICIO para usarla en todas partes)
function formatearTexto(texto) {
    if (!texto) return "";
    let resultado = texto;
    
    // 0. Convertir saltos de línea (antes de aplicar formatos)
    resultado = resultado.replace(/\n/g, '<br>');
    
    // 1. Rojo (*)
    resultado = resultado.replace(/\*(.*?)\*/g, '<span class="texto-rojo">$1</span>');
    // 2. Verde (_)
    resultado = resultado.replace(/_(.*?)_/g, '<span class="texto-verde">$1</span>');
    // 3. Tachado (~)
    resultado = resultado.replace(/~(.*?)~/g, '<span class="texto-tachado">$1</span>');
    
    return resultado;
}

/**
 * Convierte specs en lista <li> Y aplica formato
 */
function parseSpecs(specsString) {
    if (!specsString) return '';

    return specsString.split('|')
        .map(spec => {
            const parts = spec.split(':');
            if (parts.length < 2) {
                return `<li>${formatearTexto(spec)}</li>`; 
            }
            const key = parts[0];
            const value = parts.slice(1).join(':');
            return `<li><strong>${formatearTexto(key)}:</strong> ${formatearTexto(value)}</li>`;
        })
        .join('');
}

// --- Código principal ---
const contenedor = document.getElementById('catalogo-container');

fetch(GOOGLE_SHEET_URL)
    .then(respuesta => respuesta.text())
    .then(csvTexto => {
        contenedor.innerHTML = ''; 
        const filas = csvTexto.split('\n');

        // --- BUCLE PRINCIPAL ---
        for (let i = 1; i < filas.length; i++) {
            
            if (!filas[i]) continue; 
            const celdas = filas[i].split('\t');
            if (!celdas[0] || celdas[0] === "") continue;
            
            // --- LECTURA DE COLUMNAS (APLICANDO FORMATO) ---
            const title = formatearTexto(celdas[0]);
            const imagenUrl = celdas[1];
            const specsRaw = formatearTexto(celdas[2]); // parseSpecs ya aplicará formato
            const mla = celdas[3];
            const stockPlaceholder = celdas[4];
            
            const ivaPorcentaje = formatearTexto(celdas[5] || "");      
            const precioMayorista = formatearTexto(celdas[6] || "-");   
            const precioSugerido = formatearTexto(celdas[7] || "-");    
            
            const leyendaOpcional = formatearTexto(celdas[8] || "");
            const precioOpcional = formatearTexto(celdas[9] || "");

            const ingresan = formatearTexto(celdas[10] || ""); 

            const uniqueId = mla ? mla.trim() : `prod-${i}`;

            const productoCard = document.createElement('div');
            productoCard.className = 'producto-card';
            const specsHTML = parseSpecs(specsRaw);

            // --- LÓGICA DE VISUALIZACIÓN ---
            let htmlPrecioOpcional = '';
            
            // Solo mostramos la caja opcional si hay precio
            if (celdas[9] && celdas[9].trim() !== "") {
                htmlPrecioOpcional = `
                    <div class="price-box opcional">
                        <span>${leyendaOpcional}</span>
                        ${precioOpcional}
                    </div>
                `;
            }

            productoCard.innerHTML = `
                <div class="product-main-info">
                    <div class="product-image">
                        <img src="${imagenUrl}" alt="${title || ''}">
                        ${ (celdas[10] && celdas[10].trim() !== "") ? `<p class="leyenda-ingreso">Reingresan: ${ingresan}</p>` : '' }
                    </div>
                    <div class="product-details">
                        <h2>${title || ''}</h2>
                        <ul class="specs-list">
                            ${specsHTML}
                        </ul>
                    </div>
                </div>
                
                <div class="product-meta-info">
                    <div class="stock-box">
                        <span>STOCK</span>
                        <div id="stock-${uniqueId}">${stockPlaceholder || '...'}</div>
                    </div>
                    
                    <div class="sku-box">
                        <span>SKU</span>
                        <div id="sku-${uniqueId}">...</div>
                    </div>

                    <div class="price-box">
                        <span>MAYORISTA S/IVA ${ivaPorcentaje}</span>
                        ${precioMayorista}
                    </div>

                    <div class="price-box">
                        <span>SUGERIDO C/IVA ${ivaPorcentaje}</span>
                        ${precioSugerido}
                    </div>

                    ${htmlPrecioOpcional}
                </div>
            `;
            
            // --- Fetch Stock/SKU ---
             (function(mlaParaBuscar, idUnico) {
                if (!mlaParaBuscar || mlaParaBuscar === "") return;
                fetch(API_STOCK_URL + "?mla=" + encodeURIComponent(mlaParaBuscar))
                    .then(respuesta => respuesta.json())
                    .then(data => {
                        if (data.stock !== undefined) {
                            const stockDiv = document.getElementById(`stock-${idUnico}`);
                            if (stockDiv) stockDiv.textContent = data.stock;
                        }
                        if (data.sku !== undefined) {
                            const skuDiv = document.getElementById(`sku-${idUnico}`);
                            if (skuDiv) skuDiv.textContent = data.sku;
                        }
                    })
                    .catch(error => console.warn('Error fetching data', error));
            })(mla, uniqueId);

            contenedor.appendChild(productoCard);
        }
    })
    .catch(error => {
        console.error('¡Error al cargar el catálogo!', error);
        contenedor.innerHTML = '<p>Error al cargar productos. Intente más tarde.</p>';
    });

