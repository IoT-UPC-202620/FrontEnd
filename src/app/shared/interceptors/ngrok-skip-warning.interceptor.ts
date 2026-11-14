import { HttpInterceptorFn } from '@angular/common/http';

/**
 * ngrok (plan free) responde con una pagina HTML de aviso a los GET de navegador.
 * Este header la omite. Solo se agrega a peticiones hacia dominios de ngrok.
 */
const NGROK_HOST = /\.ngrok(-free)?\.(app|dev|io)$/i;

export const ngrokSkipWarningInterceptor: HttpInterceptorFn = (request, next) => {
  let host = '';
  try {
    host = new URL(request.url, window.location.origin).hostname;
  } catch {
    return next(request);
  }

  if (!NGROK_HOST.test(host)) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { 'ngrok-skip-browser-warning': 'true' } }));
};
