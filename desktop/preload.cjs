const { contextBridge, ipcRenderer } = require('electron');
// A fixed capability list, never raw IPC or filesystem access.
contextBridge.exposeInMainWorld('calendarAPI', Object.freeze({
  load: () => ipcRenderer.invoke('calendar:load'),
  save: event => ipcRenderer.invoke('calendar:save', event),
  remove: id => ipcRenderer.invoke('calendar:remove', id),
  rename: (id, name) => ipcRenderer.invoke('calendar:rename', id, name),
  openDraft: () => ipcRenderer.invoke('calendar:openDraft'),
  export: () => ipcRenderer.invoke('calendar:export'),
  import: () => ipcRenderer.invoke('calendar:import'),
  assistant: prompt => ipcRenderer.invoke('calendar:assistant', prompt),
  localDraft: prompt => ipcRenderer.invoke('calendar:localDraft', prompt),
  configure: input => ipcRenderer.invoke('calendar:configure', input),
  status: () => ipcRenderer.invoke('calendar:status'),
  appStatus: () => ipcRenderer.invoke('calendar:appStatus'),
  configureApp: input => ipcRenderer.invoke('calendar:configureApp', input),
  syncStatus: () => ipcRenderer.invoke('calendar:syncStatus'),
  configureSync: input => ipcRenderer.invoke('calendar:configureSync', input),
  testSync: input => ipcRenderer.invoke('calendar:testSync', input),
  syncNow: () => ipcRenderer.invoke('calendar:syncNow'),
}));
