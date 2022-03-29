/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('mainvp');
const ctx = canvas.getContext('2d');

const targetSimrate = 30, targetRenderrate = 30;

const width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
const isMobile = width <= 480;

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let resAdjTime = performance.now();
window.addEventListener('resize', e => {
    resAdjTime = performance.now() + 300;
});

const adjHandler = () => {
    if (!resAdjTime || resAdjTime > performance.now()) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    resAdjTime = null;
}

const clamp = (v, min, max) => v > max ? max : v < min ? min : v;
const eqWMargin = (v1, v2, m) => Math.abs(v1 - v2) <= m;

let mouseX, mouseY;
let mdX, mdY;
const mouseMap = new Map();
document.addEventListener('mousemove', e => {
    mouseX = e.x;
    mouseY = e.y;
    for (let n of Polygon.getCurrentPolygon().nodes) {
        if (n.isDragged) n.position = new Vector(mouseX, mouseY);
    }
});

let ignoreMouseInput = false;
document.addEventListener('mousedown', e => {
    mouseMap.set(e.button, true);
    mdX = e.x;
    mdY = e.y;
});
document.addEventListener('mouseup', e => {
    if (clamp(e.x, 0, canvas.width) !== e.x || clamp(e.y, 0, canvas.height) !== e.y) return;
    mouseMap.delete(e.button);
    if (!ignoreMouseInput && eqWMargin(mdY, e.y, 5) && eqWMargin(mdX, e.x, 5)) new Point(mouseX, mouseY);
});

const touchMap = new Map();
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (!touchMap.get(t.identifier)) touchMap.set(t.identifier, t);
    }
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (!touchMap.get(t.identifier)) touchMap.set(t.identifier, t);
        for (let n of Polygon.getCurrentPolygon().nodes) {
            if (n.isDragged) n.position = new Vector(t.clientX, t.clientY);
        }
    }
});
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for (let t of e.changedTouches) {
        if (clamp(t.clientX, 0, canvas.width) !== t.clientX || clamp(t.clientY, 0, canvas.height) !== t.clientY) continue;
        if (eqWMargin(touchMap.get(t.identifier).clientX, t.clientX, 5) && eqWMargin(touchMap.get(t.identifier).clientY, t.clientY, 5)) new Point(t.clientX, t.clientY);
        touchMap.delete(t.identifier);
    }
});

if (isMobile) {
    document.getElementById('polyselect').remove();
    document.getElementById('polydropdown').addEventListener('change', e => {
        Polygon.currentPolygon = e.target.value;
    });
} else {
    document.getElementById('polydropdown').remove();
}

document.getElementById('rmcurrentpolygon').addEventListener('click', e => {
    if (Polygon.currentPolygon && Polygon.allPolygons.size > 1) {
        Polygon.getCurrentPolygon().destroy();
        document.getElementById(Polygon.currentPolygon).remove();
        Polygon.currentPolygon = Polygon.allPolygons.keys().next().value;
    }
});

document.getElementById('newpoly').addEventListener('click', e => {
    new Polygon();
});

for (let elem of document.getElementsByClassName('button')) {
    elem.addEventListener('mouseenter', e => { ignoreMouseInput = true; });
    elem.addEventListener('mouseleave', e => { ignoreMouseInput = false; });
}

class savedPolygon {
    constructor() {
        this.displayName;
        this.nodes = [];
        this.id = Math.random().toString(36).replace('0.', '');
    }

    addDisplayName(name) {
        this.displayName = name;
        return this;
    }

    addNode(x, y) {
        this.nodes.push({ x: x, y: y });
        return this;
    }
}

let savedState;
document.getElementById('pushstate').addEventListener('click', e => {
    savedState = new Map();
    Polygon.allPolygons.forEach((v, k) => {
        let n = new savedPolygon().addDisplayName(v.displayName);
        for (let p of v.nodes) n.addNode(p.position.x, p.position.y);
        savedState.set(n.id, n);
    });
    console.log('pushed state', savedState)
});
document.getElementById('popstate').addEventListener('click', e => {
    if (!savedState) return;
    Polygon.allPolygons.forEach((v, k) => {
        v.destroy();
    });
    Polygon.allPolygons = new Map();
    savedState.forEach((v, k) => {
        let n = new Polygon().updateName(v.name);
        for (let p of v.nodes) new Point(p.x, p.y, n);
        Polygon.allPolygons.set(n.id, n);
    });
    Polygon.currentPolygon = Polygon.allPolygons.keys().next().value;
    console.log('popped state', Polygon.allPolygons)
});

class Vector {
    constructor(x, y) {
        if (x instanceof Vector) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    add(x, y) {
        let nx = this.x, ny = this.y;
        if (x instanceof Vector) {
            nx += x.x;
            ny += x.y;
        } else {
            nx += x;
            ny += y || 0;
        }
        return new Vector(nx, ny);
    }

    subtract(x, y) {
        let nx = this.x, ny = this.y;
        if (x instanceof Vector) {
            nx -= x.x;
            ny -= x.y;
        } else {
            nx -= x;
            ny -= y || 0;
        }
        return new Vector(nx, ny);
    }

    multiply(x, y) {
        let nx = this.x, ny = this.y;
        if (x instanceof Vector) {
            nx *= x.x;
            ny *= x.y;
        } else {
            nx *= x;
            ny *= y || x;
        }
        return new Vector(nx, ny);
    }

    divide(x, y) {
        let nx = this.x, ny = this.y;
        if (x instanceof Vector) {
            nx /= x.x;
            ny /= x.y;
        } else {
            nx /= x;
            ny /= y || x;
        }
        return new Vector(nx, ny);
    }

    normalize() {
        let nx = this.x, ny = this.y;
        nx /= this.mag();
        ny /= this.mag();
        return new Vector(nx, ny);
    }

    length() {
        return Math.hypot(this.x, this.y);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
}

class Point {
    static draggedPoint = null;
    constructor(x, y, parent) {
        this.position = new Vector(x, y);
        this.radius = 7;
        this.isDragged = false;
        this.isHovered = false;
        this.hoveredTouchId = null;
        this.id = Math.random().toString(36).replace('0.', '');
        this.parent = parent || Polygon.getCurrentPolygon();
        this.parent.nodes.push(this);
    }

    render(index) {
        if (this.isDragged) ctx.fillStyle = '#AAFFAA';
        else if (this.isHovered) ctx.fillStyle = '#FF9999';
        else ctx.fillStyle = '#999999';
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(this.position.x, this.position.y, this.radius, this.radius, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillText('' + index, this.position.x, this.position.y);
    }

    contains(x, y, ar = 0) {
        return Math.pow(this.position.x - x, 2) + Math.pow(this.position.y - y, 2) < Math.pow(this.radius + ar, 2);
    }

    update() {
        if (this.parent.id !== Polygon.currentPolygon && Point.draggedPoint !== this.id) return;
        if (Point.draggedPoint && Point.draggedPoint !== this.id) return;
        if (!touchMap.get(this.hoveredTouchId)) this.hoveredTouchId = null;
        this.isHovered = false;
        this.isDragged = !!this.hoveredTouchId;
        if (this.contains(mouseX, mouseY)) this.isHovered = true;
        touchMap.forEach((v, k) => {
            if (this.contains(v.clientX, v.clientY, 10)) {
                this.isDragged = true;
                this.hoveredTouchId = k;
                return;
            }
        });
        if (this.isHovered && mouseMap.get(0)) this.isDragged = true;
        if (this.isHovered || this.isDragged) Point.draggedPoint = this.id;
        else Point.draggedPoint = null;
    }
}

const degToRad = deg => deg * Math.PI / 180;
const radToDeg = rad => rad * 180 / Math.PI;

const wrapIndex = (index, length) => index >= length ? 0 : index < 0 ? length - 1 : index;

class Polygon {
    static currentPolygon;
    static allPolygons = new Map();
    constructor(...nodes) {
        this.id = Math.random().toString(36).replace('0.', '');
        this.nodes = nodes;
        this.displayName = Math.random() < 0.5 ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)]
        if (isMobile) {
            let opt = document.createElement('option');
            opt.id = this.id;
            opt.value = this.id;
            document.getElementById('polydropdown').appendChild(opt);
        } else {
            let opt = document.createElement('a');
            opt.id = this.id;
            opt.addEventListener('click', e => { Polygon.currentPolygon = this.id; });
            opt.addEventListener('mouseenter', e => { ignoreMouseInput = true; });
            opt.addEventListener('mouseleave', e => { ignoreMouseInput = false; });
            document.getElementById('polyselect-content').appendChild(opt);
        }
        this.updateName();
        Polygon.allPolygons.set(this.id, this);
        this.lastLen = this.nodes.length;
        return this;
    }

    updateName(name) {
        if (name) this.displayName = name;
        if (this.lastLen !== this.nodes.length) {
            document.getElementById(this.id).innerText = `${this.displayName} (${this.nodes.length})`;
            this.lastLen = this.nodes.length;
        }
        return this;
    }

    tick(active) {
        this.updateName();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.nodes.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.nodes[0].position.x, this.nodes[0].position.y);
            for (let i = 1; i < this.nodes.length; i++) {
                ctx.lineTo(this.nodes[i].position.x, this.nodes[i].position.y);
            }
            ctx.closePath();
            if (active) {
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#000000';
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillStyle = '#CCCCCC';
                ctx.fill();
            }
        }
        let cl = 'Diagnostics:\n', cr = '\n', tot = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].update();
            cl += `Point: ${i}\n`;
            let ang = radToDeg(this.angle(this.nodes[wrapIndex(i - 1, this.nodes.length)].position, this.nodes[i].position, this.nodes[wrapIndex(1 + i, this.nodes.length)].position));
            tot += ang;
            cr += `${ang.toFixed(1)}deg\n`;
            this.nodes[i].render(i);
        }
        cl += `\nTotal:\nIs convex?:`;
        cr += `\n${tot.toFixed(1)}\n${tot.toFixed(1) % 60 == 0}`;
        document.getElementById('anglelist-l').innerText = cl;
        document.getElementById('anglelist-r').innerText = cr;
    }

    angle(pos1, pos2, pos3) {
        let p1p2 = Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y),
            p2p3 = Math.hypot(pos2.x - pos3.x, pos2.y - pos3.y),
            p1p3 = Math.hypot(pos3.x - pos1.x, pos3.y - pos1.y);
        return Math.acos((p2p3 * p2p3 + p1p2 * p1p2 - p1p3 * p1p3) / (2 * p2p3 * p1p2));
    }

    static tickAll() {
        Polygon.allPolygons.forEach((v, k) => {
            v.tick(false);
        });
    }

    destroy() {
        Polygon.allPolygons.delete(this.id);
        document.getElementById(this.id).remove();
    }

    static getCurrentPolygon() {
        return Polygon.allPolygons.get(this.currentPolygon);
    }
}

Polygon.currentPolygon = new Polygon().id;

ctx.fillRect(0, 0, canvas.width, canvas.height);
const render = () => {
    ctx.fillStyle = '#AAAAAA'
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    Polygon.tickAll();
    Polygon.getCurrentPolygon().tick(true);
    adjHandler();
}

const update = () => {

}

let nextframe = performance.now(), nextsim = performance.now();
(function loop() {
    if (nextframe < performance.now()) { render(); nextframe = performance.now() + (1000 / targetRenderrate); }
    if (nextsim < performance.now()) { update(); nextsim = performance.now() + (1000 / targetSimrate); }
    requestAnimationFrame(loop);
})();