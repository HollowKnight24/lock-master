import { _decorator } from 'cc';

export class EventManager {
    private static _handlers: { [key: string]: Function[] } = {};

    public static on(eventName: string, handler: Function, target?: any) {
        if (!this._handlers[eventName]) {
            this._handlers[eventName] = [];
        }
        // 为了防止上下文丢失，绑定 target
        let boundHandler = target ? handler.bind(target) : handler;
        // 记录原始引用以便移除
        (boundHandler as any)._original = handler;
        (boundHandler as any)._target = target;
        this._handlers[eventName].push(boundHandler);
    }

    public static off(eventName: string, handler: Function, target?: any) {
        let handlers = this._handlers[eventName];
        if (!handlers) return;
        for (let i = handlers.length - 1; i >= 0; i--) {
            if ((handlers[i] as any)._original === handler && (!target || (handlers[i] as any)._target === target)) {
                handlers.splice(i, 1);
            }
        }
    }

    public static emit(eventName: string, ...args: any[]) {
        let handlers = this._handlers[eventName];
        if (!handlers) return;
        // 浅拷贝一份，防止在执行回调过程中修改数组导致错乱
        let handlersCopy = [...handlers];
        for (let handler of handlersCopy) {
            handler(...args);
        }
    }
}

export class GameEvents {
    public static readonly GAME_START = "GAME_START";       // 参数: mode, levelIndex
    public static readonly GAME_OVER = "GAME_OVER";         // 参数: isWin, levelIndex, score, mode
    public static readonly QTE_HIT_BLUE = "QTE_HIT_BLUE";   // 命中蓝色
    public static readonly QTE_HIT_YELLOW = "QTE_HIT_YELLOW"; // 命中黄色
    public static readonly QTE_MISS = "QTE_MISS";           // 触发惩罚
    public static readonly UI_CLICK = "UI_CLICK";           // 界面按钮反馈
}
