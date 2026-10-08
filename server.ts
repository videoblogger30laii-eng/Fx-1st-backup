import express from 'express';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prevent unhandled rejections from crashing Cloud Run container instances
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Pure-ASCII Base64 templates for dynamic v1+v2 signed Android APK generation in memory (zero binary files on disk)
const ANDROID_MANIFEST_B64 =
  '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OAAAAAcAAAD//////////xoAAAAUABQAAQAAAAAAAAAPAAAABgAAABsAAAAIAAADGwAAAAMBEAAYAAAABwAAAP//////////GgAAAAIBEAA4AAAACAAAAP//////////GgAAABQAFAABAAAAAAAAAA8AAAAGAAAAHAAAAAgAAAMcAAAAAwEQABgAAAAIAAAA//////////8aAAAAAgEQAHQAAAAJAAAA//////////8dAAAAFAAUAAQAAAAAAAAADwAAAAcAAAAeAAAACAAAAx4AAAAPAAAACAAAAP////8IAAABAAACfw8AAAAKAAAA/////wgAABL/////DwAAAAkAAAD/////CAAAEv////8CARAAiAAAAA4AAAD//////////x8AAAAUABQABQAAAAAAAAAPAAAADQAAAP////8IAAABBgADAQ8AAAAHAAAAHgAAAAgAAAMeAAAADwAAAAYAAAAgAAAACAAAAyAAAAAPAAAACwAAAP////8IAAAS/////w8AAAAMAAAA/////wgAABGgBAAAAgEQACQAAAAUAAAA//////////8hAAAAFAAUAAAAAAAAAAAAAgEQADgAAAAVAAAA//////////8iAAAAFAAUAAEAAAAAAAAADwAAAAYAAAAjAAAACAAAAyMAAAADARAAGAAAABUAAAD//////////yIAAAACARAAOAAAABYAAAD//////////yQAAAAUABQAAQAAAAAAAAAPAAAABgAAACUAAAAIAAADJQAAAAMBEAAYAAAAFgAAAP//////////JAAAAAMBEAAYAAAAFwAAAP//////////IQAAAAMBEAAYAAAAGAAAAP//////////HwAAAAMBEAAYAAAAGQAAAP//////////HQAAAAMBEAAYAAAAGgAAAP//////////FAAAAAEBEAAYAAAAGgAAAP////8OAAAADwAAAA==';

const RESOURCES_ARSC_B64 =
  'AgAMAFACAAABAAAAAQAcADgAAAABAAAAAAAAAAABAAAgAAAAAAAAAAAAAAAVFXJlcy9kcmF3YWJsZS9pY29uLnBuZwAAAiABDAIAAH8AAABjAG8AbQAuAGYAeABzAGkAZwBuAGEAbABzAC4AcAByAG8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAEAAAIAAABYAQAAAQAAAAAAAAABABwAOAAAAAIAAAAAAAAAAAEAACQAAAAAAAAAAAAAAAcAAAAEBGF0dHIACAhkcmF3YWJsZQAAAAEAHAAoAAAAAQAAAAAAAAAAAQAAIAAAAAAAAAAAAAAABARpY29uAAACAhAAEAAAAAEAAAAAAAAAAgIQABQAAAACAAAAAQAAAAAAAAABAlQAaAAAAAIAAAABAAAAWAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAIAAADAAAAAA==';

const ICON_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAACVBMVEX/1wANFCQA5nZxGAAYAAAA20lEQVR42u3aMQrAIAxAUfX+h5auQiEOVhvf3wN5Q7aUIkkHVH8YAAAAAAAAAAAAAEAWQHsCAAAAAAAAAEgFiK8FAHAnoL0FAAAAAHAwID4CAAAAAHAjIL4WAAAAAAAAAAAAQAwQf30HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIChhm6kwAAAAAAAAAAAAAgQ/S0DoAAAAAAAAAOwHzAQB8DRhGF50mAAAAAEAmwMoAAAAAAAAAAPYAzggAAAAAAAAAAAAAAAAAAAAAAAAA4HqAJG2qA3m/hkjES1AbAAAAAElFTkSuQmCC';

const CLASSES_DEX_B64 =
  'ZGV4CjAzNQBW/nuMC0C/FS22gCI7vmEUqMeuKxzQhub0BQAAcAAAAHhWNBIAAAAAAAAAAGwFAAAgAAAAcAAAAA0AAADwAAAACgAAACQBAAAAAAAAAAAAABEAAACcAQAAAQAAACQCAACwAwAARAIAABgDAAAgAwAAIwMAACYDAAA+AwAAWQMAAG4DAACDAwAApQMAAMMDAADdAwAA/QMAAB8EAAAzBAAARgQAAEkEAABNBAAAUQQAAFUEAABYBAAAXAQAAH4EAACLBAAAlAQAAJ4EAAC0BAAA1AQAAPkEAAAJBQAAHwUAADUFAABJBQAAAQAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAAOAAAAEgAAAAIAAAAGAAAAAAAAAA4AAAALAAAAAAAAABAAAAALAAAARAIAABAAAAALAAAATAIAABAAAAALAAAAVAIAABAAAAALAAAAXAIAABAAAAALAAAAZAIAABAAAAALAAAAbAIAABEAAAALAAAAdAIAABMAAAAMAAAAfAIAAAEAAQAAAAAAAQADABcAAAABAAkAGAAAAAEABAAbAAAABQABAAAAAAAGAAgAGQAAAAYACAAaAAAABgAIABwAAAAGAAgAHQAAAAcAAgAAAAAABwAAABUAAAAHAAcAFgAAAAcABQAeAAAABwAGAB8AAAAIAAEAAAAAAAkAAQAAAAAACQADABcAAAAJAAAAAQAAAAEAAAAAAAAADQAAAAAAAABbBQAAAAAAAAEAAAACAAAAAQAAAAMAAAABAAAABAAAAAEAAAAFAAAAAQAAAAgAAAABAAAACgAAAAEAAAAMAAAAAQAAAAAAAAABAAEAAQAAAAAAAAAEAAAAcBAAAAAADgAFAAIAAgAAAAAAAAA1AAAAEhBuIAIAAwBvIAEAQwAiAQcAcCAJADEAbhAKAAEADAJuIAgAAgBuIAcAAgBuIAUAAgBuIAYAAgAiAggAcBAOAAIAbiANACEAIgIFAHAQBAACAG4gDAAhAG4gAwATABoCFABuIAsAIQAOAAAABjxpbml0PgABSQABTAAWTGFuZHJvaWQvYXBwL0FjdGl2aXR5OwAZTGFuZHJvaWQvY29udGVudC9Db250ZXh0OwATTGFuZHJvaWQvb3MvQnVuZGxlOwATTGFuZHJvaWQvdmlldy9WaWV3OwAgTGFuZHJvaWQvd2Via2l0L1dlYkNocm9tZUNsaWVudDsAHExhbmRyb2lkL3dlYmtpdC9XZWJTZXR0aW5nczsAGExhbmRyb2lkL3dlYmtpdC9XZWJWaWV3OwAeTGFuZHJvaWQvd2Via2l0L1dlYlZpZXdDbGllbnQ7ACBMY29tL2Z4c2lnbmFscy9wcm8vTWFpbkFjdGl2aXR5OwASTGphdmEvbGFuZy9TdHJpbmc7ABFNYWluQWN0aXZpdHkuamF2YQABVgACVkkAAlZMAAJWWgABWgACWkkAIGZpbGU6Ly8vYW5kcm9pZF9hc3NldC9pbmRleC5odG1sAAtnZXRTZXR0aW5ncwAHbG9hZFVybAAIb25DcmVhdGUAFHJlcXVlc3RXaW5kb3dGZWF0dXJlAB5zZXRBbGxvd0ZpbGVBY2Nlc3NGcm9tRmlsZVVSTHMAI3NldEFsbG93VW5pdmVyc2FsQWNjZXNzRnJvbUZpbGVVUkxzAA5zZXRDb250ZW50VmlldwAUc2V0RG9tU3RvcmFnZUVuYWJsZWQAFHNldEphdmFTY3JpcHRFbmFibGVkABJzZXRXZWJDaHJvbWVDbGllbnQAEHNldFdlYlZpZXdDbGllbnQAAAABAQ+BgASEBRABnAUAAAALAAAAAAAAAAEAAAAAAAAAAQAAACAAAABwAAAAAgAAAA0AAADwAAAAAwAAAAoAAAAkAQAABQAAABEAAACcAQAABgAAAAEAAAAkAgAAARAAAAgAAABEAgAAASAAAAIAAACEAgAAAiAAACAAAAAYAwAAACAAAAEAAABbBQAAABAAAAEAAABsBQAA';

const CERT_DER_B64 =
  'MIIDUzCCAjugAwIBAgIUZOJqhmE5r/0LSssqklJkqTtpKGMwDQYJKoZIhvcNAQELBQAwODEVMBMGA1UEAwwMRlhTaWduYWxzUHJvMRIwEAYDVQQKDAlGWFNpZ25hbHMxCzAJBgNVBAYTAlVTMCAXDTI2MTAwNjEyMjQyMVoYDzIwNTQwMjIxMTIyNDIxWjA4MRUwEwYDVQQDDAxGWFNpZ25hbHNQcm8xEjAQBgNVBAoMCUZYU2lnbmFsczELMAkGA1UEBhMCVVMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDKsF29XxQlBOOIikfF3JUjGJL1jb5JIdxXLT5HbEtBDyyDV9um7tV4iHVzm75rhigBmUisdn4kMKLoEMfU9Mm1dS4ubFlKa/hu6KRpaTodtSHhzpA/dr4NNYbt2b4yZgaavbwEjjlI0B7NLyu4E0dBx80LTV/mtf8l/MXWtIoULHjbWCX5Wgon5qWJn+GYydsCUCPSGh9pzdu2sz1KqxZC9beyctIOxUkmLp6zrpIUDW1vKfjuYDC3zlO8j/0RC6+nMb6oYYuu2hqctHyN4311SRyxf5XVFBy98DKhSNlOVR4s5OBiw1aioVq+yqKdqAt6meQTHS8jafIW5FoZVZS3AgMBAAGjUzBRMB0GA1UdDgQWBBQwc+HyUdg/RzXdBi9TCAzs14wyoTAfBgNVHSMEGDAWgBQwc+HyUdg/RzXdBi9TCAzs14wyoTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBuWylsxvBP/GgrApi90hFwOwRD8qiUlYcZ+d3n0RLCNvf+/j6o7cbtNFX459sUZC6jj0L1RGCtJgePbZiMqosa5MmoKqiattGKi9sfPUX/Ch3KhYWaIw7CZEX7tMGTGmdKkdss+lD/s/2ldl+dBWkxAbYLmV5MR+s29WCBHsoxIdBgMk1ak7WJRrGJjUcA9C8mEEl4dAnjD/ThNEZHY1YrkLpL+1JZXhDcBRGqGZhk/ZQlTN5I6akVmPcJNB/7RpzxVhuty3ZWbpG1jY2w4Do1+X7Qkm0Aoc+UTknFSuE6RUQpk5W+F1sWkhp7jDg23AKTwcczD1DQe1K+TwZJJMbR';

const SPKI_DER_B64 =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyrBdvV8UJQTjiIpHxdyVIxiS9Y2+SSHcVy0+R2xLQQ8sg1fbpu7VeIh1c5u+a4YoAZlIrHZ+JDCi6BDH1PTJtXUuLmxZSmv4buikaWk6HbUh4c6QP3a+DTWG7dm+MmYGmr28BI45SNAezS8ruBNHQcfNC01f5rX/JfzF1rSKFCx421gl+VoKJ+aliZ/hmMnbAlAj0hofac3btrM9SqsWQvW3snLSDsVJJi6es66SFA1tbyn47mAwt85TvI/9EQuvpzG+qGGLrtoanLR8jeN9dUkcsX+V1RQcvfAyoUjZTlUeLOTgYsNWoqFavsqinagLepnkEx0vI2nyFuRaGVWUtwIDAQAB';

const RSA_PREFIX_B64 =
  'MIIFCgYJKoZIhvcNAQcCoIIE+zCCBPcCAQExDTALBglghkgBZQMEAgEwCwYJKoZIhvcNAQcBoIIDVzCCA1MwggI7oAMCAQICFGTiaoZhOa/9C0rLKpJSZKk7aShjMA0GCSqGSIb3DQEBCwUAMDgxFTATBgNVBAMMDEZYU2lnbmFsc1BybzESMBAGA1UECgwJRlhTaWduYWxzMQswCQYDVQQGEwJVUzAgFw0yNjEwMDYxMjI0MjFaGA8yMDU0MDIyMTEyMjQyMVowODEVMBMGA1UEAwwMRlhTaWduYWxzUHJvMRIwEAYDVQQKDAlGWFNpZ25hbHMxCzAJBgNVBAYTAlVTMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyrBdvV8UJQTjiIpHxdyVIxiS9Y2+SSHcVy0+R2xLQQ8sg1fbpu7VeIh1c5u+a4YoAZlIrHZ+JDCi6BDH1PTJtXUuLmxZSmv4buikaWk6HbUh4c6QP3a+DTWG7dm+MmYGmr28BI45SNAezS8ruBNHQcfNC01f5rX/JfzF1rSKFCx421gl+VoKJ+aliZ/hmMnbAlAj0hofac3btrM9SqsWQvW3snLSDsVJJi6es66SFA1tbyn47mAwt85TvI/9EQuvpzG+qGGLrtoanLR8jeN9dUkcsX+V1RQcvfAyoUjZTlUeLOTgYsNWoqFavsqinagLepnkEx0vI2nyFuRaGVWUtwIDAQABo1MwUTAdBgNVHQ4EFgQUMHPh8lHYP0c13QYvUwgM7NeMMqEwHwYDVR0jBBgwFoAUMHPh8lHYP0c13QYvUwgM7NeMMqEwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAblspbMbwT/xoKwKYvdIRcDsEQ/KolJWHGfnd59ESwjb3/v4+qO3G7TRV+OfbFGQuo49C9URgrSYHj22YjKqLGuTJqCqomrbRiovbHz1F/wodyoWFmiMOwmRF+7TBkxpnSpHbLPpQ/7P9pXZfnQVpMQG2C5leTEfrNvVggR7KMSHQYDJNWpO1iUaxiY1HAPQvJhBJeHQJ4w/04TRGR2NWK5C6S/tSWV4Q3AURqhmYZP2UJUzeSOmpFZj3CTQf+0ac8VYbrct2Vm6RtY2NsOA6Nfl+0JJtAKHPlE5JxUrhOkVEKZOVvhdbFpIae4w4NtwCk8HHMw9Q0HtSvk8GSSTG0TGCAXkwggF1AgEBMFAwODEVMBMGA1UEAwwMRlhTaWduYWxzUHJvMRIwEAYDVQQKDAlGWFNpZ25hbHMxCzAJBgNVBAYTAlVTAhRk4mqGYTmv/QtKyyqSUmSpO2koYzALBglghkgBZQMEAgEwDQYJKoZIhvcNAQEBBQAEggEA';

const KEY_PEM_B64 =
  'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZd2dnU2lBZ0VBQW9JQkFRREtzRjI5WHhRbEJPT0kKaWtmRjNKVWpHSkwxamI1SklkeFhMVDVIYkV0QkR5eURWOXVtN3RWNGlIVnptNzVyaGlnQm1VaXNkbjRrTUtMbwpFTWZVOU1tMWRTNHViRmxLYS9odTZLUnBhVG9kdFNIaHpwQS9kcjROTllidDJiNHlaZ2FhdmJ3RWpqbEkwQjdOCkx5dTRFMGRCeDgwTFRWL210ZjhsL01YV3RJb1VMSGpiV0NYNVdnb241cVdKbitHWXlkc0NVQ1BTR2g5cHpkdTIKc3oxS3F4WkM5YmV5Y3RJT3hVa21McDZ6cnBJVURXMXZLZmp1WURDM3psTzhqLzBSQzYrbk1iNm9ZWXV1MmhxYwp0SHlONDMxMVNSeXhmNVhWRkJ5OThES2hTTmxPVlI0czVPQml3MWFpb1ZxK3lxS2RxQXQ2bWVRVEhTOGphZklXCjVGb1pWWlMzQWdNQkFBRUNnZ0VBRVppZEVyY2gzeExkRS9uNVFDYWx0ZDNJeUZPTlhQajVFWUptZ1RuWUVLWmEKRlc3M3JUYlh4bmFHUjhxU0RmQ2dJWDltclQ0K05qTVl1Vy9YZ1ZmYytRbGF3SUg4Z0hiK0l0YkVpemdzNk81VQpLaS9PR3d4YWRIZ2NwaUo4bmhCNGEwK2tkbnJJWTFkYURUTVdwd3paWjA4S3NIdi9vdDVTNzcvUmh4RzJXUWpaCm9VWVhwZ1BRTFBiSU1TY1M4M3JZZlo4VTRTZkRpZ3BkTXlJN3hqRjJ5ZVBOMjdhbU5IcnFSNmZQTnUwMlYyMkYKQ2FHRUVrbU1IZzJWQkJTak0zVHhiR2FqZ2hRTDhoMDdFYVQ5UmVrR2N4L3NyT00xZncxWVhUVlFNMjBheEFpcgpqdjE4cENoUHlYUHFWVU9yZjJuZmlBZy82aUo0ckN6N1o5ekdmQTA5WVFLQmdRRDVLK2RuajNuWkp5MVhsYXowCisyVmZteW5JeDhac0FLQWI4RG1aSFhjL2l1Mm1ZMWI0bGNTMnl4MVpSWjUwTEx6bHhjNk5HeVBNbTVYY3pMbEMKZjhYQkw0NGQ0UGVxd2pCV3crWjVlRjRwNXJZa3J2ZFFZRlorZ05aSGtPRXQ0NVNKNDl2VXdmTXkrOUwxeUJRZAp1V0x6SHZuRkM1ejNaTkwzUjJudGEwSkhGd0tCZ1FEUVBsdUlOa3BmRm9EZm9MSW1LVVRsa2d5cDBQT2duSmNNCnJCRGxqczhNNWs0TDR1VWptS3hsZzg1N1V0SlpVRG9mdDBmY2w0V2Yvb21LODlCZkxaUjBGbWJkdk5aV24rUzUKRTMrUkVpSDd2ZnR2SHR5cU84THVhdXU4R2RGVkJTSXhMUjBoUGVweEFrVzFiZk0wcngwcUZ4dVJYZ0phT2dicwpqZEoyNXRPallRS0JnQUxzZWZXa0lGams5Y28rVGw0OWlPMzdReDFCQXRvSGs5bGdFenp4dEpHQlR0S1IvZFpDCjQ2RUZkeDJ5REc3dWkzVGl3azZ6ajlMNXpHTmYzNWloS1MvZ0gvbkh4d0F3OFNKRGdEUFNyc0F0SGR3R1ZZNlMKNHREdk1CUjg1YmVGSVJ3UkdXWkF0RnJYeTV6b3NSdThMaVlPS2Y0ZTZjT1pZa1JXaVM2cEFJa1hBb0dBSzNDRwptWUJ4dlNvdGtmaXNrT2RVOXVxamQ1MGQ1U2dsSGtDYWViaHptb1pFUzVoMklobk1CSlVkTW42UllJNHF3Y2p5CjFhSkovcGtUU2dnWU5IS0dvRHk0RXBNOHh1OHR3Q25BRjV3SHVNTGx1MFZkMUtrSXZjRlNFWGYxUWQ0RFJ1eloKUWNEdnNjaytqMTB6T1k4NTd6akl5R2NxNkhWb1VsbzNTQlJZbTZFQ2dZQmgvYnA4SkNzeUVuQXYvbjV6dk5XcwpFblA0OC93QzJjWVB1WUtxdjErL0V3VWRxN0xIUk92TmQ4ZFRkaEdOdkhBc2tqZ2V2bVFTSy9IZHBIYUhvbUpBClhDdTl4QkxQSlJjTWJtRkJRc2hKU2lsZnh1T3dETXFTeHdjY3BQaFkzb1ZIV3BRSFBQUXZMejFEL251bHhMVlAKM1gzYXozRG5ieHVFeUl2WGVibFRhQT09Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';

// CRC32 Table for ZIP generation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Dynamically builds a 4-byte zipaligned Android APK signed with BOTH
 * APK Signature Scheme v1 (JAR META-INF) and APK Signature Scheme v2 (APK Sig Block 42).
 */
function buildSignedAndroidApk(indexHtmlContent) {
  const privateKeyPem = Buffer.from(KEY_PEM_B64, 'base64').toString('utf-8');
  const certDer = Buffer.from(CERT_DER_B64, 'base64');
  const spkiDer = Buffer.from(SPKI_DER_B64, 'base64');
  const rsaPrefix = Buffer.from(RSA_PREFIX_B64, 'base64');

  const appFiles = [
    { name: 'AndroidManifest.xml', data: Buffer.from(ANDROID_MANIFEST_B64, 'base64'), compress: true },
    { name: 'resources.arsc', data: Buffer.from(RESOURCES_ARSC_B64, 'base64'), compress: false },
    { name: 'res/drawable/icon.png', data: Buffer.from(ICON_PNG_B64, 'base64'), compress: false },
    { name: 'classes.dex', data: Buffer.from(CLASSES_DEX_B64, 'base64'), compress: true },
    { name: 'assets/index.html', data: Buffer.from(indexHtmlContent, 'utf-8'), compress: true },
  ];

  // 1. Build v1 JAR Signature (META-INF/MANIFEST.MF, CERT.SF, CERT.RSA)
  const mfLines = ['Manifest-Version: 1.0', 'Created-By: 1.0 (Android)', ''];
  const sfEntries = [];

  for (const f of appFiles) {
    const sha = crypto.createHash('sha256').update(f.data).digest('base64');
    const entry = `Name: ${f.name}\r\nSHA-256-Digest: ${sha}\r\n\r\n`;
    mfLines.push(entry.trim());
    mfLines.push('');
    const sfSha = crypto.createHash('sha256').update(Buffer.from(entry, 'utf-8')).digest('base64');
    sfEntries.push(`Name: ${f.name}\r\nSHA-256-Digest: ${sfSha}\r\n\r\n`);
  }

  const manifestMf = Buffer.from(mfLines.join('\r\n'), 'utf-8');
  const mfHash = crypto.createHash('sha256').update(manifestMf).digest('base64');
  const certSf = Buffer.from(
    `Signature-Version: 1.0\r\nCreated-By: 1.0 (Android)\r\nSHA-256-Digest-Manifest: ${mfHash}\r\n\r\n` +
      sfEntries.join(''),
    'utf-8'
  );
  const v1Sig = crypto.sign('sha256', certSf, privateKeyPem);
  const certRsa = Buffer.concat([rsaPrefix, v1Sig]);

  const allEntries = [
    ...appFiles,
    { name: 'META-INF/MANIFEST.MF', data: manifestMf, compress: true },
    { name: 'META-INF/CERT.SF', data: certSf, compress: true },
    { name: 'META-INF/CERT.RSA', data: certRsa, compress: true },
  ];

  // 2. Build 4-byte aligned ZIP sections
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const e of allEntries) {
    const nameBuf = Buffer.from(e.name, 'utf-8');
    const uncompressed = e.data;
    const uSize = uncompressed.length;
    const crc = crc32(uncompressed);
    let compData = uncompressed;
    let method = 0;
    if (e.compress) {
      compData = zlib.deflateRawSync(uncompressed, { level: 9 });
      method = 8;
    }
    const cSize = compData.length;

    // 4-byte zipalign for STORED (uncompressed) entries like resources.arsc and icon.png
    let extraLen = 0;
    if (method === 0) {
      const rem = (offset + 30 + nameBuf.length) % 4;
      if (rem !== 0) extraLen = 4 - rem;
    }
    const extraBuf = Buffer.alloc(extraLen, 0);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0x0021, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(cSize, 18);
    lh.writeUInt32LE(uSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(extraLen, 28);

    const localEntry = Buffer.concat([lh, nameBuf, extraBuf, compData]);
    localParts.push(localEntry);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x0021, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(cSize, 20);
    cd.writeUInt32LE(uSize, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);

    cdParts.push(Buffer.concat([cd, nameBuf]));
    offset += localEntry.length;
  }

  const section1 = Buffer.concat(localParts);
  const section3 = Buffer.concat(cdParts);

  const lp = (buf) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(buf.length, 0);
    return Buffer.concat([b, buf]);
  };
  const u32 = (n) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0, 0);
    return b;
  };
  const u64 = (n) => {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(n), 0);
    return b;
  };

  const makeSigBlock = (topDigest) => {
    // 0x0103 = RSA_PKCS1_V1_5_WITH_SHA256
    const digestEntry = lp(Buffer.concat([u32(0x0103), lp(topDigest)]));
    const digestsSeq = lp(digestEntry);
    const certsSeq = lp(lp(certDer));
    const attrsSeq = u32(0);
    const signedData = Buffer.concat([digestsSeq, certsSeq, attrsSeq]);
    const sigBytes = crypto.sign('sha256', signedData, privateKeyPem);
    const sigEntry = lp(Buffer.concat([u32(0x0103), lp(sigBytes)]));
    const sigsSeq = lp(sigEntry);
    const signer = lp(Buffer.concat([lp(signedData), sigsSeq, lp(spkiDer)]));
    const signersSeq = lp(signer);
    const pairPayload = Buffer.concat([u32(0x7109871a), signersSeq]);
    const pair = Buffer.concat([u64(pairPayload.length), pairPayload]);
    const magic = Buffer.from('APK Sig Block 42', 'ascii');
    const sizeOfBlock = pair.length + 8 + 16;
    return Buffer.concat([u64(sizeOfBlock), pair, u64(sizeOfBlock), magic]);
  };

  const dummyBlock = makeSigBlock(Buffer.alloc(32));
  const newCdOffset = section1.length + dummyBlock.length;

  const section4 = Buffer.alloc(22);
  section4.writeUInt32LE(0x06054b50, 0);
  section4.writeUInt16LE(0, 4);
  section4.writeUInt16LE(0, 6);
  section4.writeUInt16LE(allEntries.length, 8);
  section4.writeUInt16LE(allEntries.length, 10);
  section4.writeUInt32LE(section3.length, 12);
  section4.writeUInt32LE(newCdOffset, 16);
  section4.writeUInt16LE(0, 20);

  const eocdForDigest = Buffer.from(section4);
  eocdForDigest.writeUInt32LE(section1.length, 16);

  const chunkDigests = [];
  for (const sec of [section1, section3, eocdForDigest]) {
    for (let pos = 0; pos < sec.length; pos += 1048576) {
      const chunk = sec.subarray(pos, Math.min(pos + 1048576, sec.length));
      const h = crypto.createHash('sha256');
      h.update(Buffer.from([0xa5]));
      h.update(u32(chunk.length));
      h.update(chunk);
      chunkDigests.push(h.digest());
    }
  }
  const topH = crypto.createHash('sha256');
  topH.update(Buffer.from([0x5a]));
  topH.update(u32(chunkDigests.length));
  for (const cd of chunkDigests) topH.update(cd);
  const topDigest = topH.digest();

  const realBlock = makeSigBlock(topDigest);
  return Buffer.concat([section1, realBlock, section3, section4]);
}

let cachedStandaloneHtml = null;
let cachedApkBuffer = null;

async function getOrBuildStandaloneHtml() {
  if (cachedStandaloneHtml) return cachedStandaloneHtml;

  const distAssetsDir = path.join(__dirname, 'dist', 'assets');
  if (!fs.existsSync(distAssetsDir)) {
    try {
      const { build } = await import('vite');
      await build();
    } catch (e) {
      console.warn('On-demand Vite build warning:', e?.message);
    }
  }

  const iconPath = path.join(__dirname, 'public', 'icon.svg');
  let iconDataUri = '/icon.svg';
  if (fs.existsSync(iconPath)) {
    const iconSvg = fs.readFileSync(iconPath, 'utf-8');
    iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg, 'utf-8').toString('base64')}`;
  }

  let cssContent = '';
  let jsContent = '';

  if (fs.existsSync(distAssetsDir)) {
    const files = fs.readdirSync(distAssetsDir);
    for (const file of files) {
      if (file.endsWith('.css')) {
        cssContent += fs.readFileSync(path.join(distAssetsDir, file), 'utf-8') + '\n';
      } else if (file.endsWith('.js')) {
        jsContent += fs.readFileSync(path.join(distAssetsDir, file), 'utf-8') + '\n';
      }
    }
  }

  if (!jsContent) {
    return null;
  }

  // Replace /icon.svg with data URI, strip import.meta so it executes as a classic <script> on Android file:// and content:// URLs
  const safeJs = jsContent
    .replace(/\/icon\.svg/g, iconDataUri)
    .replace(/import\.meta/g, '({env:{}})')
    .replace(/<\/script/gi, '<\\/script');

  cachedStandaloneHtml = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="${iconDataUri}" />
    <link rel="apple-touch-icon" href="${iconDataUri}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>FX Signals Pro — Institutional Mobile App</title>
    <meta name="theme-color" content="#080B11" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <script>
      // 1. Safe localStorage & sessionStorage polyfill for Android WebView (file://) and Chrome Downloads (content://)
      (function() {
        try {
          var __t = '__fx_storage_ok__';
          window.localStorage.setItem(__t, __t);
          window.localStorage.removeItem(__t);
        } catch (e) {
          var __mem = {};
          var mockStorage = {
            getItem: function(k) { return Object.prototype.hasOwnProperty.call(__mem, k) ? __mem[k] : null; },
            setItem: function(k, v) { __mem[k] = String(v); },
            removeItem: function(k) { delete __mem[k]; },
            clear: function() { __mem = {}; }
          };
          try { Object.defineProperty(window, 'localStorage', { value: mockStorage }); } catch (_) {}
          try { Object.defineProperty(window, 'sessionStorage', { value: mockStorage }); } catch (_) {}
        }

        // 2. Rewrite relative /api/... requests when running inside standalone APK (file://) or local HTML (content://)
        var origFetch = window.fetch;
        if (origFetch && (window.location.protocol === 'file:' || window.location.protocol === 'content:')) {
          var remoteBase = 'https://ais-pre-khyxbhrliwbprp5vdzyqd6-952034086177.asia-southeast1.run.app';
          window.fetch = function(input, init) {
            if (typeof input === 'string' && input.indexOf('/api/') === 0) {
              return origFetch.call(window, remoteBase + input, init).catch(function() {
                return new Response(JSON.stringify({ fallback: true }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });
              });
            }
            return origFetch.call(window, input, init);
          };
        }
      })();
    </script>
    <style>${cssContent}</style>
  </head>
  <body class="bg-[#080B11] text-[#F1F5F9] antialiased select-none font-sans overflow-x-hidden">
    <div id="root"></div>
    <script>${safeJs}</script>
  </body>
</html>`;

  return cachedStandaloneHtml;
}

async function getOrBuildApkBuffer() {
  if (cachedApkBuffer) return cachedApkBuffer;
  const html = await getOrBuildStandaloneHtml();
  const fallbackHtml =
    html ||
    '<!doctype html><html><body style="background:#080B11;color:#fff;font-family:sans-serif;padding:24px"><h2>FX Signals Pro</h2><p>Loading terminal...</p></body></html>';
  cachedApkBuffer = buildSignedAndroidApk(fallbackHtml);
  return cachedApkBuffer;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Server-side proxy for TradingView Scanner to avoid browser CORS restrictions
  app.post('/api/market/tv-scan', async (req, res) => {
    try {
      const { market = 'forex', tickers = [], columns = ['close', 'change', 'high', 'low', 'open'] } = req.body || {};
      const allowedMarkets = ['forex', 'cfd', 'america', 'crypto'];
      const safeMarket = allowedMarkets.includes(market) ? market : 'forex';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const tvRes = await fetch(`https://scanner.tradingview.com/${safeMarket}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; FXInstitutionalTerminal/1.2)',
        },
        body: JSON.stringify({
          symbols: { tickers },
          columns,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!tvRes.ok) {
        res.status(tvRes.status).json({ error: `TradingView scanner HTTP ${tvRes.status}` });
        return;
      }

      const data = await tvRes.json();
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err?.message || 'TradingView scanner proxy error' });
    }
  });

  // Official Forex Factory / Fair Economy Calendar feed proxy with 10-minute in-memory cache
  let ffCalendarCache: { data: any; timestamp: number } | null = null;
  app.get('/api/calendar/ff-live', async (_req, res) => {
    try {
      const now = Date.now();
      if (ffCalendarCache && now - ffCalendarCache.timestamp < 10 * 60 * 1000) {
        res.setHeader('X-Cache', 'HIT');
        res.json(ffCalendarCache.data);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const ffRes = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (ffRes.ok) {
        const data = await ffRes.json();
        ffCalendarCache = { data, timestamp: now };
        res.setHeader('X-Cache', 'MISS');
        res.json(data);
        return;
      }

      if (ffCalendarCache) {
        res.json(ffCalendarCache.data);
        return;
      }
      res.status(ffRes.status).json({ error: 'Failed to fetch from Fair Economy' });
    } catch (err: any) {
      if (ffCalendarCache) {
        res.json(ffCalendarCache.data);
        return;
      }
      res.status(502).json({ error: err?.message || 'Error proxying Fair Economy calendar' });
    }
  });

  // Universal & Institutional AI Copilot endpoint powered by Gemini
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const {
        prompt,
        persona,
        currentSignals = [],
        bestTrade = null,
        allPairs = [],
        economicEvents = [],
        currencyStrengths = [],
        history = [],
        imageBase64 = null,
        imageMimeType = 'image/jpeg',
      } = req.body || {};

      if ((!prompt || typeof prompt !== 'string') && !imageBase64) {
        res.status(400).json({ error: 'Prompt or image is required' });
        return;
      }

      const effectivePrompt =
        prompt && prompt.trim()
          ? prompt.trim()
          : 'Analyze this uploaded screenshot in detail: identify any currency pairs, chart patterns, MT5 orders/positions, price levels, or news shown, cross-check with live terminal data, and give a clear trading recommendation.';

      const activeSignalsList = Array.isArray(currentSignals)
        ? currentSignals.filter((s) => s.status === 'RUNNING' || s.status === 'PENDING')
        : [];
      const closedSignalsList = Array.isArray(currentSignals)
        ? currentSignals.filter((s) => s.status === 'HIT_SL' || s.status === 'HIT_TP')
        : [];

      const signalsSummary =
        activeSignalsList.length > 0
          ? activeSignalsList
              .slice(0, 15)
              .map(
                (s) =>
                  `- ${s.pair?.symbol} (${s.type}, ${s.timeframe}): Status=${s.status}, Entry=${s.entryPrice}, Current=${s.currentPrice || s.pair?.currentPrice}, SL=${s.stopLoss}, TP1=${s.takeProfit1}, R:R=${s.riskReward}, Confluence=${s.confluenceScore}%, Pips=${s.pips}, Rationale="${s.rationale}"`
              )
              .join('\n')
          : 'None';

      const closedSignalsSummary =
        closedSignalsList.length > 0
          ? closedSignalsList
              .map(
                (s) =>
                  `- ${s.pair?.symbol} (${s.type}, ${s.timeframe}): Outcome=${s.status}, Entry=${s.entryPrice}, ClosedAt=${s.currentPrice || s.pair?.currentPrice}, SL=${s.stopLoss}, TP1=${s.takeProfit1}, Pips=${s.pips}`
              )
              .join('\n')
          : 'None';

      const pairsSummary = Array.isArray(allPairs)
        ? allPairs
            .map((p) => {
              const live = p.currentPrice || p.basePrice || 0;
              const base = p.basePrice || live || 1;
              const pct = base > 0 ? +(((live - base) / base) * 100).toFixed(2) : 0;
              return `${p.symbol}: ${live} (${pct >= 0 ? '+' : ''}${pct}%)`;
            })
            .join(', ')
        : '';

      const eventsSummary = Array.isArray(economicEvents)
        ? economicEvents
            .map(
              (e) =>
                `- [${e.currency}] ${e.title} (${e.impact} Impact, Time: ${e.timeFormatted || e.time}): Actual=${e.actual || 'Pending'}, Forecast=${e.forecast}, Previous=${e.previous}, Affected Pairs=${(e.affectedPairs || []).join(', ')}. ${e.ifBeatScenario || ''} ${e.ifMissScenario || ''}`
            )
            .join('\n')
        : '';

      const strengthSummary = Array.isArray(currencyStrengths)
        ? currencyStrengths
            .map((c) => `${c.currency}: ${c.strength ?? c.score}/10 (${c.status || c.trend})`)
            .join(', ')
        : '';

      const personaTitle = persona?.title || 'Universal AI Copilot';
      const personaDesc =
        persona?.description ||
        'Universal trading, macroeconomic news, technical analysis, and financial market intelligence assistant.';

      const systemInstruction = `You are "${personaTitle}" (${personaDesc}) inside an institutional Forex, Gold (XAU/USD), Indices (US30, NAS100), and Crypto trading terminal.

CRITICAL DIRECTIVES:
1. DIRECT VERDICT FIRST: When the user asks "Is it buy or sell?", "Analyze [pair]", or asks about any specific asset/trade, ALWAYS provide a clear, definitive institutional verdict (e.g. "**🎯 INSTITUTIONAL VERDICT: SELL (Bearish Trend Continuation)**" or "**🎯 INSTITUTIONAL VERDICT: BUY (Discount Pullback Entry)**" or "**🎯 INSTITUTIONAL VERDICT: WAIT / STANDBY (Mid-Range Consolidation)**") in the very first line!
2. RE-ENTRY / HIT SL INQUIRIES: If the user asks about a trade that hit Stop Loss and whether to re-enter (e.g. "I was trading gbpcad but it hit sl, will it be good to re-enter now?"), directly address that EXACT pair:
   - Provide a clear **🎯 RE-ENTRY VERDICT: [WAIT FOR CONFIRMATION / SECOND CHANCE LIMIT ENTRY / STANDBY]**.
   - Diagnose why the previous SL likely hit (e.g. liquidity sweep / stop hunt into 4H Order Block vs true structural breakdown).
   - Check current Currency Strength and live price action for that pair.
   - Provide concrete re-entry execution levels (Limit Entry, new SL beyond sweep wick, TP1, TP2) and rules (no revenge market orders).
3. NEVER ask the user for current prices, charts, or timeframes — you have the complete LIVE TERMINAL CONTEXT provided below with exact live prices for all 30 assets, active signals, currency strengths, and news events. Use this live data directly!
4. ALWAYS provide concrete price levels in your response:
   - **Live Market Price**
   - **Recommended Entry Zone**
   - **Protective Stop Loss (SL)** with exact pip risk
   - **Take Profit Targets (TP1 & TP2)** with exact pip gains and R:R ratio
   - **Interbank Strength & Technical Driver** (Order Blocks, FVG, EMA trend, and Currency Strength score).
5. If an image is uploaded (such as a chart, MT5 order, or news screenshot), inspect all visible text, candlesticks, positions, and numbers in the image and directly address their question about the image.
6. If the user asks about news, risk calculation, prop firms, or SMC concepts, answer their exact question with structured markdown, formulas, and actionable steps.

=== LIVE TERMINAL CONTEXT ===
Best Trade Now: ${bestTrade ? `${bestTrade.pair?.symbol} ${bestTrade.type} @ ${bestTrade.entryPrice} (SL: ${bestTrade.stopLoss}, TP1: ${bestTrade.takeProfit1}, Confluence: ${bestTrade.confluenceScore}%)` : 'N/A'}

Active Signals on Terminal:
${signalsSummary}

Recently Closed Signals (Hit TP or Hit SL):
${closedSignalsSummary}

Live Market Prices (30 Assets):
${pairsSummary}

Economic Calendar & News Events:
${eventsSummary}

Live Currency Strength Meter:
${strengthSummary}
=============================`;

      const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h) => `${h.isUser ? 'User' : 'Copilot'}: ${h.text}`)
            .join('\n\n')
        : '';

      const fullPrompt = recentHistory
        ? `Previous conversation context:\n${recentHistory}\n\nCurrent User Query: ${effectivePrompt}`
        : effectivePrompt;

      const cleanBase64 =
        typeof imageBase64 === 'string'
          ? imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
          : null;

      const contents = cleanBase64
        ? [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: imageMimeType || 'image/jpeg',
              },
            },
            {
              text: `The user uploaded an image alongside their question. First, carefully read and analyze everything visible inside the uploaded image (all text, alerts, pairs, entry/SL/TP prices, chart candlesticks, or MT5 trades) and directly answer their question about the image!\n\n${fullPrompt}`,
            },
          ]
        : fullPrompt;

      const modelCandidates = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ];

      let responseText = '';

      for (const candidateModel of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents,
            config: {
              systemInstruction,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch {
          // Try next candidate model
        }
      }

      if (!responseText) {
        res.json({ text: null, fallback: true });
        return;
      }

      res.json({ text: responseText });
    } catch {
      res.json({ text: null, fallback: true });
    }
  });

  // Self-contained Single-File Standalone Mobile App Download Endpoint
  app.get('/api/download/mobile-app', async (_req, res) => {
    try {
      const standaloneHtml = await getOrBuildStandaloneHtml();
      if (!standaloneHtml) {
        res.status(404).json({ error: 'Standalone bundle is still compiling. Please try again in a few seconds.' });
        return;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="FX-Signals-Pro-Mobile-App.html"');
      res.send(standaloneHtml);
    } catch (err) {
      res.status(500).json({ error: err?.message || 'Failed to generate standalone mobile app' });
    }
  });

  // Native Android APK Download Endpoint (4-byte zipaligned, v1+v2 signed, full self-contained bundle)
  const serveAndroidApk = async (_req, res) => {
    try {
      const apkBuf = await getOrBuildApkBuffer();
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="FX-Signals-Pro.apk"');
      res.setHeader('Content-Length', String(apkBuf.length));
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(apkBuf);
    } catch (err) {
      res.status(500).send(err?.message || 'Failed to build APK');
    }
  };

  app.get('/FX-Signals-Pro.apk', serveAndroidApk);
  app.get('/api/download/apk', serveAndroidApk);

  const distPath = path.join(__dirname, 'dist');
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isProduction = process.env.NODE_ENV === 'production' || isCloudRun;

  let viteMounted = false;
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      viteMounted = true;
    } catch (err) {
      console.warn('Vite dev middleware unavailable, falling back to static dist:', err?.message);
    }
  }

  if (!viteMounted) {
    app.use(express.static(distPath));
    app.use(async (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        try {
          const html = await getOrBuildStandaloneHtml();
          if (html) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
            return;
          }
        } catch {}
        res.status(200).send('<!doctype html><html lang="en" class="dark"><head><meta charset="UTF-8"/><title>FX Signals Pro</title></head><body style="background:#080B11;color:#fff;font-family:sans-serif;padding:32px"><h2>FX Signals Pro Terminal</h2><p>Loading application bundle...</p><script>window.location.reload();</script></body></html>');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Pre-warm the standalone HTML and APK buffer in background
    setTimeout(() => {
      getOrBuildApkBuffer().catch(() => {});
    }, 500);
  });
}

startServer();
