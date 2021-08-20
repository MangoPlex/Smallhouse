export namespace QuickElements {
    export function create(text: string, classes = "", cb?: (event: MouseEvent) => any): HTMLDivElement {
        let e = document.createElement("div");
        e.textContent = text;
        e.className = classes;
        if (cb) e.addEventListener("click", ev => cb(ev));
        return e;
    }
    
    export function label(text: string, classes = "", cb?: (event: MouseEvent) => any): HTMLDivElement {
        return create(text, "label " + classes, cb);
    }
    
    export function button(text: string, classes = "", cb?: (event: MouseEvent) => any): HTMLDivElement {
        return create(text, "button " + classes, cb);
    }
}