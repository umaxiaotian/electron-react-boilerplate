// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';

export type Channels = 'ipc-example';

// 型エイリアスを Electron から“拾う”（any を自分で書かない）
type IpcSendParams = Parameters<typeof ipcRenderer.send>;            // [channel: string, ...args: any[]]
type IpcOnListener = Parameters<typeof ipcRenderer.on>[1];           // (event, ...args: any[]) => void
type IpcOnceListener = Parameters<typeof ipcRenderer.once>[1];       // (event, ...args: any[]) => void

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      // [channel, ...args] を send の正しいパラメータ型に変換して渡す（any を自書きしない）
      const params = [channel, ...args] as unknown as IpcSendParams;
      ipcRenderer.send(...params);
    },

    on(channel: Channels, func: (...args: unknown[]) => void) {
      // 受け口は IpcOnListener 型で受ける（署名は any[] だが自分では any と書かない）
      const subscription: IpcOnListener = (_event, ...raw) => {
        // コールバックへは unknown[] として渡す
        func(...(raw as unknown[]));
      };
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

    once(channel: Channels, func: (...args: unknown[]) => void) {
      const onceHandler: IpcOnceListener = (_event, ...raw) => {
        func(...(raw as unknown[]));
      };
      ipcRenderer.once(channel, onceHandler);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
