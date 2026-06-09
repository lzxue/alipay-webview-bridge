declare global {
  interface Window {
    my?: {
      postMessage: (data: Record<string, unknown>) => void;
      onMessage: ((e: Record<string, unknown>) => void) | null;
    };
  }
}

export interface LogEntry {
  time: string;
  level: string;
  msg: string;
  data?: unknown;
}

export type LogListener = (log: LogEntry, all: LogEntry[]) => void;
export type MessageHandler = (data: Record<string, unknown>) => void;

export interface SendAsyncOptions {
  timeout?: number;
  responseType?: string;
}

// ========== State ==========
let isReady = false;
const messageHandlers: Record<string, MessageHandler[]> = {};
const logListeners: LogListener[] = [];

// ========== Logging ==========
export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success',
  SEND: 'send',
  RECV: 'recv',
} as const;

let logs: LogEntry[] = [];
const MAX_LOGS = 100;

export function addLog(level: string, msg: string, data: unknown = null): void {
  const log: LogEntry = { time: new Date().toLocaleTimeString(), level, msg, data };
  logs.unshift(log);
  if (logs.length > MAX_LOGS) logs = logs.slice(0, MAX_LOGS);
  logListeners.forEach((fn) => {
    try { fn(log, logs); } catch { /* ignore */ }
  });
}

export function addLogListener(fn: LogListener): () => void {
  logListeners.push(fn);
  return () => { logListeners.splice(logListeners.indexOf(fn), 1); };
}

export function getLogs(): LogEntry[] { return [...logs]; }
export function clearLogs(): void { logs = []; }

// ========== Environment Detection ==========
export function isInMiniprogram(): boolean {
  return !!(window.my && window.my.postMessage);
}

// ========== Dynamic Bridge Loading ==========
const BRIDGE_URL = 'https://appx/web-view.min.js';

function loadBridgeScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.my?.postMessage) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = BRIDGE_URL;
    script.onload = () => {
      addLog(LogLevel.INFO, 'web-view.min.js loaded');
      resolve();
    };
    script.onerror = () => {
      addLog(LogLevel.WARN, 'Failed to load web-view.min.js (not in miniprogram)');
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ========== Init ==========
export function init(): Promise<void> {
  if (isReady) return Promise.resolve();

  return loadBridgeScript().then(() => {
    if (isInMiniprogram()) {
      window.my!.onMessage = (e: Record<string, unknown>) => {
        addLog(LogLevel.RECV, '[Mini→H5] ' + JSON.stringify(e));
        handleMessage(e);
      };
      isReady = true;
      addLog(LogLevel.SUCCESS, 'SDK initialized');
    } else {
      addLog(LogLevel.WARN, 'Not in miniprogram environment');
    }
  });
}

// ========== Send Messages ==========
export function send(type: string, params: Record<string, unknown> = {}): void {
  const data = { type, ...params };
  addLog(LogLevel.SEND, '[H5→Mini] ' + JSON.stringify(data));
  if (isInMiniprogram()) {
    try {
      window.my!.postMessage(data);
    } catch (e: unknown) {
      addLog(LogLevel.ERROR, 'postMessage failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  } else {
    addLog(LogLevel.WARN, '(Not in miniprogram, message not sent)');
  }
}

export function sendAsync(type: string, params: Record<string, unknown> = {}, opts: SendAsyncOptions = {}): Promise<Record<string, unknown>> {
  const timeout = opts.timeout || 30000;
  const responseType = opts.responseType || (type.replace(/^request_/, '') + '_response');

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      removeHandler(responseType, handler);
      reject(new Error('Request timeout: ' + type));
    }, timeout);

    function handler(data: Record<string, unknown>) {
      clearTimeout(timer);
      removeHandler(responseType, handler);
      if (data.status === 'success') {
        resolve(data);
      } else {
        reject(new Error((data.errorMessage as string) || 'Request failed'));
      }
    }

    on(responseType, handler);
    send(type, params);
  });
}

// ========== Receive Messages ==========
function handleMessage(data: Record<string, unknown>): void {
  if (!data || !data.type) return;
  const handlers = messageHandlers[data.type as string];
  if (handlers) {
    handlers.forEach((h) => {
      try { h(data); } catch (e: unknown) {
        addLog(LogLevel.ERROR, e instanceof Error ? e.message : String(e));
      }
    });
  }
}

export function on(type: string, handler: MessageHandler): () => void {
  if (!messageHandlers[type]) messageHandlers[type] = [];
  messageHandlers[type].push(handler);
  return () => removeHandler(type, handler);
}

function removeHandler(type: string, handler: MessageHandler): void {
  if (!messageHandlers[type]) return;
  messageHandlers[type] = messageHandlers[type].filter((h) => h !== handler);
}

export function once(type: string, handler: MessageHandler): () => void {
  const remove = on(type, (data) => { remove(); handler(data); });
  return remove;
}

// ========== Preset APIs ==========

export function requestAuthCode(scopes = 'auth_base') {
  return sendAsync('request_authcode', { scopes }, { responseType: 'authcode_response' });
}

export function requestLocation(locationType = 0) {
  return sendAsync('request_location', { locationType }, { responseType: 'location_response' });
}

export function requestVibrate(vibrateType = 'light') {
  return sendAsync('request_vibrate', { vibrateType }, { responseType: 'vibrate_response' });
}

export function setNavbar(params: Record<string, unknown> = {}) {
  return sendAsync('set_navbar', params, { responseType: 'navbar_response' });
}

export function setPageTitle(title: string) {
  return sendAsync('page_title', { content: title }, { responseType: 'title_response' });
}

export function reloadWebView(url?: string) {
  return sendAsync('reload_webview', url ? { url } : {}, { responseType: 'reload_response' });
}

// ========== High-frequency APIs ==========

export function showToast(content?: string, toastType?: string, duration?: number) {
  return sendAsync('showToast', { content: content || '', toastType: toastType || 'none', duration: duration || 2000 }, { responseType: 'showToast_response' });
}

export function showLoading(content?: string) {
  return sendAsync('showLoading', { content: content || '加载中...' }, { responseType: 'showLoading_response' });
}

export function hideLoading() {
  return sendAsync('hideLoading', {}, { responseType: 'hideLoading_response' });
}

export function alert(title?: string, content?: string, buttonText?: string) {
  return sendAsync('alert', { title: title || '', content: content || '', buttonText: buttonText || '确定' }, { responseType: 'alert_response' });
}

export function confirm(title?: string, content?: string, confirmButtonText?: string, cancelButtonText?: string) {
  return sendAsync('confirm', {
    title: title || '', content: content || '',
    confirmButtonText: confirmButtonText || '确定', cancelButtonText: cancelButtonText || '取消',
  }, { responseType: 'confirm_response' });
}

export function getSystemInfo() {
  return sendAsync('getSystemInfo', {}, { responseType: 'getSystemInfo_response' });
}

export function getNetworkType() {
  return sendAsync('getNetworkType', {}, { responseType: 'getNetworkType_response' });
}

export function getServerTime() {
  return sendAsync('getServerTime', {}, { responseType: 'getServerTime_response' });
}

export function setStorage(key: string, data: unknown) {
  return sendAsync('setStorage', { key, data }, { responseType: 'setStorage_response' });
}

export function getStorage(key: string) {
  return sendAsync('getStorage', { key }, { responseType: 'getStorage_response' });
}

export function removeStorage(key: string) {
  return sendAsync('removeStorage', { key }, { responseType: 'removeStorage_response' });
}

export function setClipboard(text: string) {
  return sendAsync('setClipboard', { text }, { responseType: 'setClipboard_response' });
}

export function getClipboard() {
  return sendAsync('getClipboard', {}, { responseType: 'getClipboard_response' });
}

export function scan(scanType?: string) {
  return sendAsync('scan', { scanType: scanType || 'qr' }, { responseType: 'scan_response' });
}

export function makePhoneCall(number: string) {
  return sendAsync('makePhoneCall', { number }, { responseType: 'makePhoneCall_response' });
}

// ========== Enhanced APIs ==========

export function chooseImage(count?: number, sourceType?: string[]) {
  return sendAsync('chooseImage', { count: count || 1, sourceType: sourceType || ['camera', 'album'] }, { responseType: 'chooseImage_response' });
}

export function previewImage(urls: string[], current?: number) {
  return sendAsync('previewImage', { urls: urls || [], current: current || 0 }, { responseType: 'previewImage_response' });
}

export function saveImage(url: string) {
  return sendAsync('saveImage', { url }, { responseType: 'saveImage_response' });
}

export function openLocation(params: Record<string, unknown>) {
  return sendAsync('openLocation', params || {}, { responseType: 'openLocation_response' });
}

export function chooseLocation() {
  return sendAsync('chooseLocation', {}, { responseType: 'chooseLocation_response' });
}

export function datePicker(format?: string, currentDate?: string) {
  return sendAsync('datePicker', { format: format || 'yyyy-MM-dd', currentDate: currentDate || '' }, { responseType: 'datePicker_response' });
}

export function showActionSheet(title?: string, items?: string[], cancelButtonText?: string) {
  return sendAsync('showActionSheet', { title: title || '', items: items || [], cancelButtonText: cancelButtonText || '取消' }, { responseType: 'showActionSheet_response' });
}

export function httpRequest(params: Record<string, unknown>) {
  return sendAsync('httpRequest', params || {}, { responseType: 'httpRequest_response' });
}

export function tradePay(tradeNO: string) {
  return sendAsync('tradePay', { tradeNO }, { responseType: 'tradePay_response' });
}

// ========== Sensors ==========

export function startAccelerometer(interval?: string) {
  return sendAsync('startAccelerometer', { interval: interval || 'normal' }, { responseType: 'startAccelerometer_response' });
}

export function stopAccelerometer() {
  return sendAsync('stopAccelerometer', {}, { responseType: 'stopAccelerometer_response' });
}

export function onAccelerometerChange(callback: (data: unknown) => void): () => void {
  return on('push', (data) => { if (data.event === 'accelerometerChange') callback(data.data); });
}

export function startGyroscope(interval?: string) {
  return sendAsync('startGyroscope', { interval: interval || 'normal' }, { responseType: 'startGyroscope_response' });
}

export function stopGyroscope() {
  return sendAsync('stopGyroscope', {}, { responseType: 'stopGyroscope_response' });
}

export function onGyroscopeChange(callback: (data: unknown) => void): () => void {
  return on('push', (data) => { if (data.event === 'gyroscopeChange') callback(data.data); });
}

export function startCompass(interval?: string) {
  return sendAsync('startCompass', { interval: interval || 'normal' }, { responseType: 'startCompass_response' });
}

export function stopCompass() {
  return sendAsync('stopCompass', {}, { responseType: 'stopCompass_response' });
}

export function onCompassChange(callback: (data: unknown) => void): () => void {
  return on('push', (data) => { if (data.event === 'compassChange') callback(data.data); });
}

export function startDeviceMotionListening(interval?: string) {
  return sendAsync('startDeviceMotionListening', { interval: interval || 'normal' }, { responseType: 'startDeviceMotionListening_response' });
}

export function stopDeviceMotionListening() {
  return sendAsync('stopDeviceMotionListening', {}, { responseType: 'stopDeviceMotionListening_response' });
}

export function onDeviceMotionChange(callback: (data: unknown) => void): () => void {
  return on('push', (data) => { if (data.event === 'deviceMotionChange') callback(data.data); });
}

// ========== Bluetooth ==========

export function openBluetoothAdapter() { return sendAsync('openBluetoothAdapter', {}, { responseType: 'openBluetoothAdapter_response' }); }
export function closeBluetoothAdapter() { return sendAsync('closeBluetoothAdapter', {}, { responseType: 'closeBluetoothAdapter_response' }); }
export function getBluetoothAdapterState() { return sendAsync('getBluetoothAdapterState', {}, { responseType: 'getBluetoothAdapterState_response' }); }
export function startBluetoothDevicesDiscovery(services?: string[]) { return sendAsync('startBluetoothDevicesDiscovery', { services: services || [] }, { responseType: 'startBluetoothDevicesDiscovery_response' }); }
export function stopBluetoothDevicesDiscovery() { return sendAsync('stopBluetoothDevicesDiscovery', {}, { responseType: 'stopBluetoothDevicesDiscovery_response' }); }
export function getBluetoothDevices() { return sendAsync('getBluetoothDevices', {}, { responseType: 'getBluetoothDevices_response' }); }
export function getConnectedBluetoothDevices(services?: string[]) { return sendAsync('getConnectedBluetoothDevices', { services: services || [] }, { responseType: 'getConnectedBluetoothDevices_response' }); }
export function connectBLEDevice(deviceId: string) { return sendAsync('connectBLEDevice', { deviceId }, { responseType: 'connectBLEDevice_response' }); }
export function disconnectBLEDevice(deviceId: string) { return sendAsync('disconnectBLEDevice', { deviceId }, { responseType: 'disconnectBLEDevice_response' }); }
export function getBLEDeviceServices(deviceId: string) { return sendAsync('getBLEDeviceServices', { deviceId }, { responseType: 'getBLEDeviceServices_response' }); }
export function getBLEDeviceCharacteristics(deviceId: string, serviceId: string) { return sendAsync('getBLEDeviceCharacteristics', { deviceId, serviceId }, { responseType: 'getBLEDeviceCharacteristics_response' }); }

// ========== WiFi ==========

export function startWifi() { return sendAsync('startWifi', {}, { responseType: 'startWifi_response' }); }
export function stopWifi() { return sendAsync('stopWifi', {}, { responseType: 'stopWifi_response' }); }
export function getConnectedWifi() { return sendAsync('getConnectedWifi', {}, { responseType: 'getConnectedWifi_response' }); }
export function connectWifi(params: Record<string, unknown>) { return sendAsync('connectWifi', params || {}, { responseType: 'connectWifi_response' }); }

// ========== Bio Auth ==========

export function checkBioAuthMode() { return sendAsync('checkBioAuthMode', {}, { responseType: 'checkBioAuthMode_response' }); }
export function startBioAuth(authType?: string) { return sendAsync('startBioAuth', { type: authType || 'fingerPrint' }, { responseType: 'startBioAuth_response' }); }

// ========== Navigation & Misc ==========

export function navigateTo(url: string) { return sendAsync('navigateTo', { url }, { responseType: 'navigateTo_response' }); }
export function navigateBack(delta?: number) { return sendAsync('navigateBack', { delta: delta || 1 }, { responseType: 'navigateBack_response' }); }
export function navigateToMiniProgram(appId: string, path?: string, extraData?: Record<string, unknown>) {
  return sendAsync('navigateToMiniProgram', { appId, path: path || '', extraData: extraData || {} }, { responseType: 'navigateToMiniProgram_response' });
}
export function getScreenBrightness() { return sendAsync('getScreenBrightness', {}, { responseType: 'getScreenBrightness_response' }); }
export function setScreenBrightness(brightness: number) { return sendAsync('setScreenBrightness', { brightness }, { responseType: 'setScreenBrightness_response' }); }
export function setKeepScreenOn(keepScreenOn: boolean) { return sendAsync('setKeepScreenOn', { keepScreenOn: keepScreenOn !== false }, { responseType: 'setKeepScreenOn_response' }); }
export function addPhoneCalendar(params: Record<string, unknown>) { return sendAsync('addPhoneCalendar', params || {}, { responseType: 'addPhoneCalendar_response' }); }
export function getAddress() { return sendAsync('getAddress', {}, { responseType: 'getAddress_response' }); }
export function choosePhoneContact() { return sendAsync('choosePhoneContact', {}, { responseType: 'choosePhoneContact_response' }); }
export function chooseAlipayContact(count?: number) { return sendAsync('chooseAlipayContact', { count: count || 1 }, { responseType: 'chooseAlipayContact_response' }); }
export function getRunData(params?: Record<string, unknown>) { return sendAsync('getRunData', params || {}, { responseType: 'getRunData_response' }); }
export function getOpenUserInfo() { return sendAsync('getOpenUserInfo', {}, { responseType: 'getOpenUserInfo_response' }); }
export function getPhoneNumber() { return sendAsync('getPhoneNumber', {}, { responseType: 'getPhoneNumber_response' }); }
export function getBatteryInfo() { return sendAsync('getBatteryInfo', {}, { responseType: 'getBatteryInfo_response' }); }
export function startPullDownRefresh() { return sendAsync('startPullDownRefresh', {}, { responseType: 'startPullDownRefresh_response' }); }
export function stopPullDownRefresh() { return sendAsync('stopPullDownRefresh', {}, { responseType: 'stopPullDownRefresh_response' }); }
