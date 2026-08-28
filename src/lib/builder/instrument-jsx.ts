export interface CodeFragment {
  id: number;
  tag: string;
  /** Offset de inicio/fin en el código ORIGINAL (sin instrumentar). */
  start: number;
  end: number;
  source: string;
}

export interface InstrumentResult {
  /** Código con `data-vera-id="N"` inyectado en cada etiqueta HTML nativa. */
  taggedCode: string;
  /** id -> fragmento de código original (para enviar como patch a la IA). */
  fragments: Map<number, CodeFragment>;
}

interface RawTag {
  id: number;
  tag: string;
  nameEnd: number;
}

/**
 * Escanea el JSX de un componente y localiza cada etiqueta HTML nativa
 * (minúscula) emparejando apertura/cierre con una pila, para poder:
 * 1) inyectarle un `data-vera-id` secuencial (usado por el click-to-edit
 *    del preview para saber qué elemento del DOM se pulsó), y
 * 2) recuperar el fragmento de código ORIGINAL exacto que le corresponde,
 *    para mandar solo ese fragmento a la IA en vez de todo el componente.
 *
 * No es un parser JS completo — es un escáner de texto que ignora el
 * contenido de strings/template literals/comentarios y no desciende en
 * sub-componentes en mayúscula (no hay garantía de que reenvíen props al
 * DOM). Es suficiente para el tipo de componente que genera V.E.R.A: un
 * único componente autocontenido con JSX plano y Tailwind.
 */
export function instrumentCode(code: string): InstrumentResult {
  const n = code.length;
  let i = 0;
  let nextId = 0;
  const rawTags: RawTag[] = [];
  const fragments = new Map<number, CodeFragment>();
  const stack: { tag: string; start: number; id: number | null }[] = [];

  const isNameChar = (ch: string) => /[A-Za-z0-9.]/.test(ch);

  while (i < n) {
    const ch = code[i];

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < n && code[i] !== quote) {
        if (code[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "`") {
      i++;
      while (i < n && code[i] !== "`") {
        if (code[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      while (i < n && code[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < n && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (ch === "<") {
      // Etiqueta de cierre: </Tag> o </>
      if (code[i + 1] === "/") {
        let j = i + 2;
        let name = "";
        while (j < n && isNameChar(code[j])) {
          name += code[j];
          j++;
        }
        while (j < n && code[j] !== ">") j++;
        j++;
        const top = stack.pop();
        if (top && top.tag === name && top.id !== null) {
          fragments.set(top.id, { id: top.id, tag: top.tag, start: top.start, end: j, source: code.slice(top.start, j) });
        }
        i = j;
        continue;
      }

      // Fragment shorthand: <>
      if (code[i + 1] === ">") {
        stack.push({ tag: "", start: i, id: null });
        i += 2;
        continue;
      }

      // Etiqueta de apertura: <Tag ...> o <Tag .../>
      if (/[A-Za-z]/.test(code[i + 1] ?? "")) {
        let j = i + 1;
        let name = "";
        while (j < n && isNameChar(code[j])) {
          name += code[j];
          j++;
        }
        const nameEnd = j;

        let depth = 0;
        let selfClosing = false;
        while (j < n) {
          const c = code[j];
          if (c === '"' || c === "'") {
            const quote = c;
            j++;
            while (j < n && code[j] !== quote) {
              if (code[j] === "\\") j++;
              j++;
            }
            j++;
            continue;
          }
          if (c === "{") {
            depth++;
            j++;
            continue;
          }
          if (c === "}") {
            depth--;
            j++;
            continue;
          }
          if (depth === 0 && c === "/" && code[j + 1] === ">") {
            selfClosing = true;
            j += 2;
            break;
          }
          if (depth === 0 && c === ">") {
            j++;
            break;
          }
          j++;
        }

        const isNative = /^[a-z]/.test(name);
        const id = isNative ? nextId++ : null;
        if (id !== null) rawTags.push({ id, tag: name, nameEnd });

        if (selfClosing) {
          if (id !== null) {
            fragments.set(id, { id, tag: name, start: i, end: j, source: code.slice(i, j) });
          }
        } else {
          stack.push({ tag: name, start: i, id });
        }
        i = j;
        continue;
      }
    }

    i++;
  }

  // Inyectar data-vera-id en orden inverso de aparición para no desplazar
  // los offsets de las inserciones aún pendientes (todas anteriores en el
  // texto).
  let taggedCode = code;
  for (let k = rawTags.length - 1; k >= 0; k--) {
    const t = rawTags[k];
    const insertion = ` data-vera-id="${t.id}"`;
    taggedCode = taggedCode.slice(0, t.nameEnd) + insertion + taggedCode.slice(t.nameEnd);
  }

  return { taggedCode, fragments };
}
