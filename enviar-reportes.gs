/** Envío por correo de reportes (Google Apps Script, gratis). Sirve para la app de aseo y para el consentimiento de bicicletas. */
const DESTINATARIOS = 'feristays@gmail.com,ericasierraq@gmail.com,lufergo8813@gmail.com';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
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
