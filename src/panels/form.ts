/**
 * Web form panel, generated from the FormDefinition (layout.yaml + meta.yaml).
 *
 * Two-way sync through the app state: a form edit rewrites the YAML from the
 * form's data (`dataToYaml`) with origin 'form-panel'; a YAML change made
 * elsewhere refills the form. While the YAML is invalid the form keeps its
 * last good values and is disabled, so it never overwrites what the user is
 * typing in the YAML box.
 *
 * Warning hook (for validation): every data key, and `appendix`, has a
 * wrapper `[data-field="<key>"]` containing a `.field-warning` slot. Use
 * `FormPanel.setWarnings(key, messages)` rather than writing to it directly.
 */
import { fromIsoDate, toIsoDate } from '../dates';
import type { Bilingual, DataKeyDef, FieldDef, FormDefinition } from '../forms/definition';
import { dataToYaml } from '../forms/serialise';
import { ui, type Lang } from '../i18n';
import type { AppSnapshot, AppState } from '../state';
import { isRecord } from '../values';

const ORIGIN = 'form-panel';

export type { Lang };

export interface FormPanelOptions {
  /** Interface and label language. Default: 'en'. */
  lang?: Lang;
}

export interface FormPanel {
  /** The `[data-field="<key>"]` wrapper of a data key (or `appendix`). */
  fieldElement(key: string): HTMLElement | undefined;
  /** Show messages in the field's warning slot; an empty list clears it. */
  setWarnings(key: string, messages: string[]): void;
}

type Data = Record<string, unknown>;
type AppendixData = Data & { title?: unknown; columns?: unknown; col_widths?: unknown; rows?: unknown };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', undefined, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

const asText = (value: unknown): string => (value === undefined || value === null || value === false ? '' : String(value));

let idCounter = 0;
const nextId = (key: string) => `form-${key.replace(/\W/g, '-')}-${++idCounter}`;

export function mountFormPanel(root: HTMLElement, state: AppState, def: FormDefinition, options: FormPanelOptions = {}): FormPanel {
  const lang = options.lang ?? 'en';
  const t = (b: Bilingual) => b[lang];
  const s = ui[lang].form;

  /** Last valid data from the state, plus the form's own edits. */
  let current: Data = {};
  const wrappers = new Map<string, HTMLElement>();
  /** Per data key: puts a data value into its input(s). */
  const fillers = new Map<string, (data: Data) => void>();

  const commit = () => state.setYaml(dataToYaml(def, current), ORIGIN);
  const setValue = (key: string, value: unknown) => {
    if (value === '' || value === false) delete current[key];
    else current[key] = value;
  };

  function wrapper(key: string, className: string): HTMLElement {
    const wrap = el('div', `form-field ${className}`);
    wrap.dataset.field = key;
    wrappers.set(key, wrap);
    return wrap;
  }

  function helpAndWarning(wrap: HTMLElement, help: Bilingual | undefined): void {
    if (help) wrap.append(el('small', 'field-help', t(help)));
    const warning = el('ul', 'field-warning');
    warning.hidden = true;
    warning.setAttribute('aria-live', 'polite');
    wrap.append(warning);
  }

  function textInput(field: FieldDef, k: DataKeyDef): HTMLElement {
    const wrap = wrapper(k.key, `field-${field.type}`);
    const id = nextId(k.key);
    const label = el('label', undefined, t(k.label));
    label.htmlFor = id;
    const input = field.type === 'lines' ? el('textarea') : el('input');
    if (input instanceof HTMLInputElement) input.type = 'text';
    else input.rows = 4;
    input.id = id;
    input.name = k.key;
    if (k.format === 'date') input.placeholder = 'jj/mm/aaaa';
    if (k.format === 'time') input.placeholder = '19 h 30';
    wrap.append(label, input);

    let picker: HTMLInputElement | undefined;
    if (k.format === 'date') {
      picker = el('input', 'date-picker');
      picker.type = 'date';
      picker.setAttribute('aria-label', s.pickDate(t(k.label)));
      picker.addEventListener('input', () => {
        const text = fromIsoDate(picker!.value);
        if (!text) return;
        input.value = text;
        setValue(k.key, text);
        commit();
      });
      wrap.append(picker);
    }

    input.addEventListener('input', () => {
      if (picker) picker.value = toIsoDate(input.value);
      setValue(k.key, input.value);
      commit();
    });
    fillers.set(k.key, (data) => {
      input.value = asText(data[k.key]);
      if (picker) picker.value = toIsoDate(input.value);
    });
    helpAndWarning(wrap, k.help);
    return wrap;
  }

  const checkboxes = new Map<string, HTMLInputElement>();

  function checkInput(field: FieldDef): HTMLElement {
    const wrap = wrapper(field.key, 'field-check');
    if (field.group) wrap.dataset.group = field.group;
    const id = nextId(field.key);
    const box = el('input');
    box.type = 'checkbox';
    box.id = id;
    box.name = field.key;
    checkboxes.set(field.key, box);
    const label = el('label', undefined, t(field.label));
    label.htmlFor = id;
    wrap.append(box, label);
    box.addEventListener('change', () => {
      setValue(field.key, box.checked);
      // Radio-like group: "one or none", so ticking one unticks the others.
      const group = box.checked && field.group ? def.groups.find((g) => g.id === field.group) : undefined;
      for (const other of group?.fields ?? []) {
        if (other === field.key) continue;
        const otherBox = checkboxes.get(other);
        if (otherBox) otherBox.checked = false;
        delete current[other];
      }
      commit();
    });
    fillers.set(field.key, (data) => {
      box.checked = data[field.key] === true;
    });
    helpAndWarning(wrap, field.help);
    return wrap;
  }

  function fieldElements(field: FieldDef): HTMLElement[] {
    if (field.type === 'check') return [checkInput(field)];
    const inputs = field.dataKeys.map((k) => textInput(field, k));
    if (!field.template) return inputs;
    // Template field (e.g. dates): its data keys, under the field's label.
    const group = el('div', 'form-template');
    group.append(el('div', 'form-template-label', t(field.label)), ...inputs);
    return [group];
  }

  // --- Appendix editor ---

  const appendixKey = def.appendix.key;
  const appendixWrap = wrapper(appendixKey, 'field-appendix');
  const appendixBody = el('div', 'appendix-editor');
  appendixWrap.append(el('div', 'form-template-label', t(def.appendix.label)));
  helpAndWarning(appendixWrap, def.appendix.help);
  appendixWrap.append(appendixBody);

  const appendixData = (): AppendixData | undefined => {
    const value = current[appendixKey];
    return isRecord(value) ? value : undefined;
  };
  const columnsOf = (a: AppendixData): string[] =>
    Array.isArray(a.columns) ? a.columns.map(asText) : def.appendix.example.columns;
  const rowsOf = (a: AppendixData): unknown[][] => {
    if (!Array.isArray(a.rows)) a.rows = [];
    const rows = a.rows as unknown[];
    rows.forEach((row, i) => {
      if (!Array.isArray(row)) rows[i] = [row];
    });
    return rows as unknown[][];
  };

  function appendixTextInput(a: AppendixData, name: 'title' | 'intro' | 'outro', labelText: string, multiline: boolean): HTMLElement {
    const row = el('div', 'appendix-prop');
    const id = nextId(`appendix-${name}`);
    const label = el('label', undefined, labelText);
    label.htmlFor = id;
    const input = multiline ? el('textarea') : el('input');
    if (input instanceof HTMLTextAreaElement) input.rows = 2;
    input.id = id;
    input.name = `${appendixKey}.${name}`;
    input.value = asText(a[name]);
    input.addEventListener('input', () => {
      if (input.value === '' && name !== 'title') delete a[name];
      else a[name] = input.value;
      commit();
    });
    row.append(label, input);
    return row;
  }

  function renderAppendix(): void {
    const a = appendixData();
    if (!a) {
      appendixBody.replaceChildren(
        button(s.addAppendix, () => {
          const { columns, col_widths } = def.appendix.example;
          const fresh: AppendixData = { title: '', columns: [...columns] };
          if (col_widths) fresh.col_widths = [...col_widths];
          fresh.rows = [columns.map(() => '')];
          current[appendixKey] = fresh;
          renderAppendix();
          commit();
        }),
      );
      return;
    }
    const columns = columnsOf(a);
    const rows = rowsOf(a);

    const table = el('table', 'appendix-rows');
    const headRow = el('tr');
    for (const c of columns) headRow.append(el('th', undefined, c));
    headRow.append(el('th'));
    table.append(el('thead'), el('tbody'));
    table.tHead!.append(headRow);
    rows.forEach((row, i) => {
      const tr = el('tr');
      columns.forEach((column, j) => {
        const td = el('td');
        const input = el('input');
        input.type = 'text';
        input.name = `${appendixKey}.rows.${i}.${j}`;
        input.setAttribute('aria-label', s.cell(i + 1, column));
        input.value = asText(row[j]);
        input.addEventListener('input', () => {
          while (row.length < columns.length) row.push('');
          row[j] = input.value;
          commit();
        });
        td.append(input);
        tr.append(td);
      });
      const td = el('td');
      td.append(
        button(s.removeRow, () => {
          rows.splice(i, 1);
          renderAppendix();
          commit();
        }),
      );
      tr.append(td);
      table.tBodies[0].append(tr);
    });

    appendixBody.replaceChildren(
      appendixTextInput(a, 'title', s.title, false),
      appendixTextInput(a, 'intro', s.intro, true),
      table,
      button(s.addRow, () => {
        rows.push(columns.map(() => ''));
        renderAppendix();
        commit();
      }),
      appendixTextInput(a, 'outro', s.outro, true),
      button(s.removeAppendix, () => {
        delete current[appendixKey];
        renderAppendix();
        commit();
      }),
    );
  }

  // --- Layout ---

  const heading = el('h2', undefined, s.heading);
  const invalidNote = el('p', 'form-invalid-note', s.invalidNote);
  invalidNote.hidden = true;
  const body = el('fieldset', 'form-body');
  for (const section of def.sections) {
    const fieldset = el('fieldset', 'form-section');
    fieldset.dataset.section = section.id;
    fieldset.append(el('legend', undefined, t(section.title)));
    for (const field of def.fields.filter((f) => f.section === section.id)) fieldset.append(...fieldElements(field));
    if (def.appendix.section === section.id) fieldset.append(appendixWrap);
    body.append(fieldset);
  }
  root.append(heading, invalidNote, body);

  const show = ({ result }: AppSnapshot, origin?: string) => {
    body.disabled = !result.ok;
    invalidNote.hidden = result.ok;
    if (!result.ok || origin === ORIGIN) return;
    current = structuredClone(result.data) as Data;
    for (const fill of fillers.values()) fill(current);
    renderAppendix();
  };
  show(state.get());
  state.subscribe(show);

  return {
    fieldElement: (key) => wrappers.get(key),
    setWarnings(key, messages) {
      const wrap = wrappers.get(key);
      const slot = wrap?.querySelector<HTMLElement>('.field-warning');
      if (!wrap || !slot) return;
      slot.replaceChildren(...messages.map((m) => el('li', undefined, m)));
      slot.hidden = messages.length === 0;
      wrap.classList.toggle('has-warning', messages.length > 0);
    },
  };
}
