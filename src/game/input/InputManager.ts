export interface TouchInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward positive)
  sprint: boolean;
  handbrake: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

/**
 * Unified input manager separating continuous held keys from single-frame justPressed edges,
 * ignoring keyboard controls while typing in UI text fields, clearing held state on window blur,
 * and supporting mouse-drag orbit, wheel zoom, touch controls, and optional Gamepad API.
 */
export class InputManager {
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private mouseDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  public lookDeltaX = 0;
  public lookDeltaY = 0;
  public wheelDelta = 0;

  public touch: TouchInputState = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    handbrake: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  };

  private canvasEl: HTMLElement | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;
  private boundVisChange: () => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundBlur = this.clearAll.bind(this);
    this.boundVisChange = () => {
      if (document.hidden) this.clearAll();
    };
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
  }

  public attach(canvasContainer: HTMLElement): void {
    this.canvasEl = canvasContainer;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
    document.addEventListener('visibilitychange', this.boundVisChange);
    canvasContainer.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
    canvasContainer.addEventListener('wheel', this.boundWheel, { passive: true });
  }

  public detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
    document.removeEventListener('visibilitychange', this.boundVisChange);
    if (this.canvasEl) {
      this.canvasEl.removeEventListener('mousedown', this.boundMouseDown);
      this.canvasEl.removeEventListener('wheel', this.boundWheel);
    }
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.clearAll();
  }

  public clearAll(): void {
    this.held.clear();
    this.justPressed.clear();
    this.mouseDragging = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.wheelDelta = 0;
    this.touch.moveX = 0;
    this.touch.moveY = 0;
    this.touch.sprint = false;
    this.touch.handbrake = false;
  }

  public triggerAction(code: string): void {
    this.justPressed.add(code);
  }

  public isHeld(code: string): boolean {
    return this.held.has(code);
  }

  public consumeJustPressed(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  public clearFrameDeltas(): void {
    this.justPressed.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.wheelDelta = 0;
    this.touch.lookDeltaX = 0;
    this.touch.lookDeltaY = 0;
  }

  public getMoveAxes(): { forward: number; right: number; sprint: boolean; handbrake: boolean } {
    let forward = 0;
    let right = 0;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) forward += 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) forward -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) right += 1;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) right -= 1;

    // Combine touch joystick
    if (Math.abs(this.touch.moveY) > 0.08) forward = this.touch.moveY;
    if (Math.abs(this.touch.moveX) > 0.08) right = this.touch.moveX;

    let sprint = this.held.has('ShiftLeft') || this.held.has('ShiftRight') || this.touch.sprint;
    let handbrake = this.held.has('Space') || this.touch.handbrake;

    // Optional Gamepad API support
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gp = navigator.getGamepads()[0];
      if (gp) {
        if (Math.abs(gp.axes[0]) > 0.18) right = gp.axes[0];
        if (Math.abs(gp.axes[1]) > 0.18) forward = -gp.axes[1];
        if (gp.buttons[7]?.pressed) forward = Math.max(forward, gp.buttons[7].value);
        if (gp.buttons[6]?.pressed) forward = Math.min(forward, -gp.buttons[6].value);
        if (gp.buttons[0]?.pressed) handbrake = true;
        if (gp.buttons[10]?.pressed) sprint = true;
        if (Math.abs(gp.axes[2]) > 0.2) this.lookDeltaX += gp.axes[2] * 10;
        if (Math.abs(gp.axes[3]) > 0.2) this.lookDeltaY += gp.axes[3] * 8;
      }
    }

    return {
      forward: Math.max(-1, Math.min(1, forward)),
      right: Math.max(-1, Math.min(1, right)),
      sprint,
      handbrake,
    };
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.isTypingTarget(e.target)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
    if (!this.held.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.held.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.held.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0 || e.button === 2) {
      this.mouseDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.mouseDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lookDeltaX += dx;
    this.lookDeltaY += dy;
  }

  private onMouseUp(): void {
    this.mouseDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    this.wheelDelta += Math.sign(e.deltaY);
  }
}
