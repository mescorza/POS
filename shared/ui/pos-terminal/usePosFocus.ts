import * as React from "react";

/**
 * Devuelve un ref que se enfoca cada vez que cambia `screenKey`, no sólo al
 * montar. El atributo HTML `autoFocus` sólo dispara una vez: como estas
 * pantallas cambian de modo (lista/formulario, buscador, etc.) reusando el
 * mismo `<div tabIndex={0}>`, React no vuelve a montarlo y el foco se
 * pierde apenas el usuario deja de tocar el teclado — obligándolo a hacer
 * clic para poder seguir usando F2-F9/flechas. Este hook resuelve eso: toda
 * la navegación queda 100% por teclado sin intervención del mouse.
 */
export function usePosFocus<T extends HTMLElement>(screenKey: unknown) {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    ref.current?.focus();
  }, [screenKey]);

  return ref;
}
