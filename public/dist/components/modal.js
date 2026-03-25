// src/components/modal.ts
/**
 * Small accessible modal helper. Usage:
 * const modal = createModal({ title: 'Result', body: 'You did it' });
 * modal.show(); modal.hide();
 */
export function createModal() {
    let backdrop = null;
    let lastActive = null;
    function build() {
        if (backdrop)
            return backdrop;
        backdrop = document.createElement('div');
        backdrop.className = 'app-modal-backdrop';
        backdrop.innerHTML = `
            <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
                <h2 id="app-modal-title"></h2>
                <div id="app-modal-body"></div>
                <div class="actions">
                    <button id="app-modal-ok" class="px-3 py-1 bg-indigo-600 text-white rounded">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
        backdrop.querySelector('#app-modal-ok').addEventListener('click', hide);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop)
                hide();
        });
        return backdrop;
    }
    function show(title, bodyHtml) {
        lastActive = document.activeElement;
        const el = build();
        el.querySelector('#app-modal-title').textContent = title;
        el.querySelector('#app-modal-body').innerHTML = bodyHtml;
        el.style.display = 'flex';
        const ok = el.querySelector('#app-modal-ok');
        ok.focus();
    }
    function hide() {
        if (!backdrop)
            return;
        backdrop.style.display = 'none';
        if (lastActive && lastActive.focus)
            lastActive.focus();
    }
    return { show, hide };
}
export default createModal;
