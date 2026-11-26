/**
 * Servidor de la app Aseo Airbnb (Google Apps Script, gratis).
 *  1) Envío por correo de reportes PDF (igual que antes; también lo usa el consentimiento de bicicletas).
 *  2) NUEVO: sincronización entre celulares. Los datos quedan en una Hoja de Google:
 *     - pestaña "datos": almacenamiento interno de la app (no editar a mano).
 *     - pestaña "Tareas": vista legible de tareas, materiales, mano de obra y totales (se actualiza sola).
 *
 * INSTALACIÓN (una sola vez):
 *  a) Pega este código reemplazando el anterior y guarda.
 *  b) Elige la función "configurar" arriba y toca Ejecutar. Acepta los permisos (Hojas de cálculo).
 *     En "Registro de ejecución" verás la CLAVE DEL EQUIPO y el enlace de la hoja.
 *  c) Implementar > Administrar implementaciones > (lápiz) Editar > Versión: "Nueva versión" > Implementar.
 *     Así el enlace /exec sigue siendo el mismo. Acceso: "Cualquier persona".
 */
const DESTINATARIOS = 'feristays@gmail.com,ericasierraq@gmail.com,lufergo8813@gmail.com';
const MAX_CELDA = 45000;   // límite de Google Sheets por celda: 50.000 caracteres

function doGet() { return json({ ok: true, servicio: 'Aseo Airbnb', version: 2 }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('datos incompletos'); }
  if (d.accion === 'sync') {
    try { return json(sincronizar(d)); } catch (err) { return json({ ok: false, error: 'Error del servidor: ' + err }); }
  }
  try {
    if (d.reportes) return ContentService.createTextOutput('ok');            // resumen de aseo: sin correo
    if (!d.pdfBase64) return ContentService.createTextOutput('datos incompletos');
    const nombre = String(d.fileName || 'documento.pdf').replace(/[^\w.\-]/g, '_');
    const pdf = Utilities.newBlob(Utilities.base64Decode(d.pdfBase64), 'application/pdf', nombre);
    const esDoc = d.tipo === 'documento';
    MailApp.sendEmail({
      to: DESTINATARIOS,
      subject: esDoc ? (d.asunto || 'Reporte') : 'Consentimiento uso de bicicletas - ' + d.name,
      body: esDoc ? (d.resumen || 'Reporte adjunto.') + '\n\nEl PDF va adjunto.'
                  : 'Nueva constancia de consentimiento.\nNombre: ' + d.name + '\nDocumento: ' + (d.docNum || '') + '\nFecha: ' + (d.when || '') + '\nCódigo: ' + (d.hash || '') + '\n\nEl PDF firmado va adjunto.',
      attachments: [pdf]
    });
    return ContentService.createTextOutput('ok');
  } catch (err) { return ContentService.createTextOutput('error: ' + err); }
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- configuración ---------- */
function configurar() {
  const p = PropertiesService.getScriptProperties();
  let k = p.getProperty('CLAVE_EQUIPO');
  if (!k) { k = Utilities.getUuid().replace(/-/g, '').slice(0, 12); p.setProperty('CLAVE_EQUIPO', k); }
  const ss = libro(); hojaDatos(ss);
  Logger.log('CLAVE DEL EQUIPO: ' + k);
  Logger.log('Hoja de datos: ' + ss.getUrl());
}
/** Úsala solo si la clave se filtró: genera otra y habrá que reconectar todos los celulares. */
function cambiarClaveEquipo() { PropertiesService.getScriptProperties().deleteProperty('CLAVE_EQUIPO'); configurar(); }

function libro() {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty('HOJA_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('Aseo Airbnb - Datos sincronizados');
  p.setProperty('HOJA_ID', ss.getId());
  return ss;
}
function hojaDatos(ss) {
  let sh = ss.getSheetByName('datos');
  if (!sh) {
    sh = ss.insertSheet('datos');
    sh.getRange('A:B').setNumberFormat('@'); sh.getRange('F:F').setNumberFormat('@');
    sh.getRange(1, 1, 1, 6).setValues([['coleccion', 'id', 'rev', 'u', 'borrado', 'json']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ---------- sincronización ---------- */
function sincronizar(d) {
  const p = PropertiesService.getScriptProperties(), clave = p.getProperty('CLAVE_EQUIPO');
  if (!clave) return { ok: false, error: 'Servidor sin configurar: ejecuta configurar() en Apps Script' };
  if (String(d.clave || '') !== clave) return { ok: false, error: 'Clave del equipo incorrecta' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'Servidor ocupado, intenta de nuevo' };
  try {
    const ss = libro(), sh = hojaDatos(ss), n = sh.getLastRow();
    const filas = n > 1 ? sh.getRange(2, 1, n - 1, 6).getValues() : [];
    const idx = {};
    filas.forEach((f, i) => { f[1] = String(f[1]); idx[f[0] + '|' + f[1]] = i; });
    const rev0 = Number(p.getProperty('REV') || 0), desde = Number(d.desde || 0);
    let rev = rev0, tareas = false;
    const rech = [];
    (d.cambios || []).forEach(c => {
      if (!c || !c.c || c.i == null) return;
      const k = c.c + '|' + c.i, borrado = c.x ? 1 : 0, js = borrado ? '' : JSON.stringify(c.d || {});
      if (js.length > MAX_CELDA) { rech.push(k); return; }
      const i = idx[k], u = Number(c.u || 0);
      if (i !== undefined && !(u > Number(filas[i][3]))) return;     // gana la versión más reciente
      rev++;
      const f = [String(c.c), String(c.i), rev, u, borrado, js];
      if (i === undefined) { idx[k] = filas.length; filas.push(f); } else filas[i] = f;
      if (c.c === 'tasks' || c.c === 'work' || c.c === 'users') tareas = true;
    });
    if (rev !== rev0) {
      sh.getRange(2, 1, filas.length, 6).setNumberFormat('@').setValues(filas);
      sh.getRange(2, 3, filas.length, 3).setNumberFormat('0');
      p.setProperty('REV', String(rev));
    }
    const cambios = filas.filter(f => Number(f[2]) > desde).map(f => ({
      c: String(f[0]), i: String(f[1]), u: Number(f[3]), x: Number(f[4]) ? 1 : 0,
      d: Number(f[4]) ? null : leer(f[5])
    }));
    if (tareas) { try { hojaTareas(ss, filas); } catch (e) { console.error(e); } }
    return { ok: true, rev: rev, cambios: cambios, rechazados: rech };
  } finally { lock.releaseLock(); }
}
function leer(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }

/* ---------- pestaña legible "Tareas" ---------- */
function hojaTareas(ss, filas) {
  const de = c => filas.filter(f => f[0] === c && !Number(f[4])).map(f => leer(f[5]));
  const us = {}; de('users').forEach(u => { us[u.id] = u.name; });
  const ws = {}; de('work').forEach(w => { ws[w.id] = w; });
  const num = v => Number(String(v == null ? '' : v).replace(/\D/g, '')) || 0;
  const cant = v => { if (v === '' || v == null) return 1; const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : 0; };
  const txt = v => { const s = String(v == null ? '' : v); return /^[=+\-@]/.test(s) ? "'" + s : s; };   // evita fórmulas inyectadas
  const quien = t => t.to === 'rol:aseo' ? 'Todo el personal de aseo' : t.to === 'rol:mant' ? 'Todo mantenimiento' : (us[t.to] || '(persona eliminada)');
  const EST = { pendiente: 'Pendiente', proceso: 'En proceso', hecha: 'Hecha' };
  const H = ['Creada', 'Tipo', 'Propiedad', 'Tarea', 'Detalle', 'Asignada a', 'Prioridad', 'Fecha límite', 'Estado', 'Hecha por', 'Terminada',
             'Comentarios', 'Materiales (detalle)', 'Total materiales', 'Mano de obra (detalle)', 'Total mano de obra', 'Total', 'Presupuesto'];
  const rows = de('tasks').sort((a, b) => (b.at || 0) - (a.at || 0)).map(t => {
    const w = ws[t.id] || {}, mats = w.mats || [], lab = w.labor || [];
    const tm = mats.reduce((a, m) => a + Math.round(cant(m.q) * num(m.p)), 0), tl = lab.reduce((a, l) => a + num(l.v), 0);
    return [t.at ? new Date(t.at) : '', t.kind === 'mant' ? 'Mantenimiento' : 'Aseo', txt(t.prop || 'General'), txt(t.title), txt(t.detail), txt(quien(t)),
      t.prio === 'urgente' ? 'Urgente' : 'Normal', t.due || '', EST[w.status] || 'Pendiente', txt(us[w.doneBy] || w.doneName || ''), w.doneAt ? new Date(w.doneAt) : '',
      txt(w.note), txt(mats.map(m => (m.d || '') + ' x' + (m.q || 1) + ' a ' + num(m.p)).join(' | ')), tm,
      txt(lab.map(l => (l.d || '') + ': ' + num(l.v)).join(' | ')), tl, tm + tl, num(t.budget) || ''];
  });
  let sh = ss.getSheetByName('Tareas'); if (!sh) sh = ss.insertSheet('Tareas');
  sh.clearContents();
  sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, H.length).setValues(rows);
    [1, 11].forEach(c => sh.getRange(2, c, rows.length, 1).setNumberFormat('dd/MM/yyyy HH:mm'));
    [14, 16, 17, 18].forEach(c => sh.getRange(2, c, rows.length, 1).setNumberFormat('$#,##0'));
  }
  sh.setFrozenRows(1);
}
