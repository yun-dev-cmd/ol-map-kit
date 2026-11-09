import Control from 'ol/control/Control.js';

/** 기본 문구. labels 옵션으로 원하는 언어로 바꾼다. */
export const DEFAULT_LABELS = {
  length: 'Distance',
  area: 'Area',
  clear: 'Clear',
  layers: 'Layers',
};

export const KO_LABELS = {
  length: '거리',
  area: '면적',
  clear: '지우기',
  layers: '레이어',
};

function button(text, action) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'omk-btn';
  b.textContent = text;
  b.dataset.omkAction = action;
  return b;
}

/**
 * 측정 버튼과 레이어 목록을 담은 작은 지도 컨트롤.
 * 측정 도구나 레이어 등록부 중 없는 쪽은 그리지 않는다.
 *
 * @param {{measure?: ReturnType<import('./measure.js').createMeasureTool>,
 *          layers?: ReturnType<import('./layers.js').createLayerRegistry>,
 *          labels?: Partial<typeof DEFAULT_LABELS>}} opts
 */
export function createToolbar({ measure, layers, labels = {} }) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const root = document.createElement('div');
  root.className = 'omk-toolbar ol-unselectable';

  let unsubscribe = null;

  if (measure) {
    const group = document.createElement('div');
    group.className = 'omk-group';
    const lengthBtn = button(t.length, 'length');
    const areaBtn = button(t.area, 'area');
    const clearBtn = button(t.clear, 'clear');
    group.append(lengthBtn, areaBtn, clearBtn);
    root.append(group);

    const sync = () => {
      const active = measure.type();
      lengthBtn.setAttribute('aria-pressed', String(active === 'length'));
      areaBtn.setAttribute('aria-pressed', String(active === 'area'));
    };
    group.addEventListener('click', (e) => {
      const action = e.target.closest('[data-omk-action]')?.dataset.omkAction;
      if (!action) return;
      if (action === 'clear') measure.clear();
      else if (measure.type() === action) measure.stop();
      else measure.start(action);
      sync();
    });
    sync();
  }

  if (layers) {
    const box = document.createElement('fieldset');
    box.className = 'omk-layers';
    const legend = document.createElement('legend');
    legend.textContent = t.layers;
    const listEl = document.createElement('div');
    box.append(legend, listEl);
    root.append(box);

    const render = (items) => {
      const switchable = items.filter((i) => i.switchable);
      box.hidden = switchable.length === 0;
      listEl.replaceChildren(...switchable.map((item) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = item.visible;
        input.addEventListener('change', () => layers.setVisible(item.id, input.checked));
        label.append(input, document.createTextNode(item.title));
        return label;
      }));
    };
    render(layers.list());
    unsubscribe = layers.onChange(render);
  }

  const control = new Control({ element: root });
  control.destroy = () => {
    if (unsubscribe) unsubscribe();
  };
  return control;
}
