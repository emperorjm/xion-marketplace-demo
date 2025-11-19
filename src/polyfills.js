"use strict";
(function patchBase64() {
    if (typeof globalThis === 'undefined') {
        return;
    }
    const target = globalThis;
    if (!target || target.__atobPatched) {
        return;
    }
    const originalAtob = typeof target.atob === 'function' ? target.atob.bind(target) : undefined;
    if (!originalAtob && typeof Buffer === 'undefined') {
        return;
    }
    const atobImpl = (data) => {
        if (!data) {
            return '';
        }
        let normalized = data.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const mod = normalized.length % 4;
        if (mod) {
            normalized = normalized.padEnd(normalized.length + (4 - mod), '=');
        }
        if (originalAtob) {
            return originalAtob(normalized);
        }
        return Buffer.from(normalized, 'base64').toString('binary');
    };
    target.atob = atobImpl;
    target.__atobPatched = true;
})();
