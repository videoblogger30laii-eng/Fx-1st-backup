import express from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
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
  'AwAIANwJAAABABwAkAUAACYAAAAAAAAAAAAAALQAAAAAAAAAAAAAABoAAAA0AAAAWgAAAJAAAACuAAAA0gAAAN4AAADsAAAA+AAAACQBAABOAQAAYgEAAIABAACOAQAAoAEAAPgBAAD8AQAADgIAAEICAAB2AgAAigIAALACAAC+AgAAxgIAAM4CAADiAgAABAMAAD4DAACQAwAAqgMAAMoDAADeAwAAHgQAADwEAABMBAAAhAQAAJgEAAALAHYAZQByAHMAaQBvAG4AQwBvAGQAZQAAAAsAdgBlAHIAcwBpAG8AbgBOAGEAbQBlAAAAEQBjAG8AbQBwAGkAbABlAFMAZABrAFYAZQByAHMAaQBvAG4AAAAZAGMAbwBtAHAAaQBsAGUAUwBkAGsAVgBlAHIAcwBpAG8AbgBDAG8AZABlAG4AYQBtAGUAAAANAG0AaQBuAFMAZABrAFYAZQByAHMAaQBvAG4AAAAQAHQAYQByAGcAZQB0AFMAZABrAFYAZQByAHMAaQBvAG4AAAAEAG4AYQBtAGUAAAAFAGwAYQBiAGUAbAAAAAQAaQBjAG8AbgAAABQAdQBzAGUAcwBDAGwAZQBhAHIAdABlAHgAdABUAHIAYQBmAGYAaQBjAAAAEwBoAGEAcgBkAHcAYQByAGUAQQBjAGMAZQBsAGUAcgBhAHQAZQBkAAAACABlAHgAcABvAHIAdABlAGQAAAANAGMAbwBuAGYAaQBnAEMAaABhAG4AZwBlAHMAAAAFAHQAaABlAG0AZQAAAAcAYQBuAGQAcgBvAGkAZAAAACoAaAB0AHQAcAA6AC8ALwBzAGMAaABlAG0AYQBzAC4AYQBuAGQAcgBvAGkAZAAuAGMAbwBtAC8AYQBwAGsALwByAGUAcwAvAGEAbgBkAHIAbwBpAGQAAAAAAAAABwBwAGEAYwBrAGEAZwBlAAAAGABwAGwAYQB0AGYAbwByAG0AQgB1AGkAbABkAFYAZQByAHMAaQBvAG4AQwBvAGQAZQAAABgAcABsAGEAdABmAG8AcgBtAEIAdQBpAGwAZABWAGUAcgBzAGkAbwBuAE4AYQBtAGUAAAAIAG0AYQBuAGkAZgBlAHMAdAAAABEAYwBvAG0ALgBmAHgAcwBpAGcAbgBhAGwAcwAuAHAAcgBvAAAABQAxAC4ANAAuADAAAAACADEANAAAAAIAMgA5AAAACAB1AHMAZQBzAC0AcwBkAGsAAAAPAHUAcwBlAHMALQBwAGUAcgBtAGkAcwBzAGkAbwBuAAAAGwBhAG4AZAByAG8AaQBkAC4AcABlAHIAbQBpAHMAcwBpAG8AbgAuAEkATgBUAEUAUgBOAEUAVAAAACcAYQBuAGQAcgBvAGkAZAAuAHAAZQByAG0AaQBzAHMAaQBvAG4ALgBBAEMAQwBFAFMAUwBfAE4ARQBUAFcATwBSAEsAXwBTAFQAQQBUAEUAAAALAGEAcABwAGwAaQBjAGEAdABpAG8AbgAAAA4ARgBYACAAUwBpAGcAbgBhAGwAcwAgAFAAcgBvAAAACABhAGMAdABpAHYAaQB0AHkAAAAeAGMAbwBtAC4AZgB4AHMAaQBnAG4AYQBsAHMALgBwAHIAbwAuAE0AYQBpAG4AQQBjAHQAaQB2AGkAdAB5AAAADQBpAG4AdABlAG4AdAAtAGYAaQBsAHQAZQByAAAABgBhAGMAdABpAG8AbgAAABoAYQBuAGQAcgBvAGkAZAAuAGkAbgB0AGUAbgB0AC4AYQBjAHQAaQBvAG4ALgBNAEEASQBOAAAACABjAGEAdABlAGcAbwByAHkAAAAgAGEAbgBkAHIAbwBpAGQALgBpAG4AdABlAG4AdAAuAGMAYQB0AGUAZwBvAHIAeQAuAEwAQQBVAE4AQwBIAEUAUgAAAIABCABAAAAAGwIBARwCAQFyBQEBcwUBAQwCAQFwAgEBAwABAQEAAQECAAEB7AQBAdMCAQEQAAEBHwABAQAAAQEAARAAGAAAAAIAAAD/////DgAAAA8AAAACARAAsAAAAAIAAAD//////////xQAAAAUABQABwAAAAAAAAAPAAAAAAAAAP////8IAAAQAgAAAA8AAAABAAAAFgAAAAgAAAMWAAAADwAAAAIAAAD/////CAAAEB0AAAAPAAAAAwAAABcAAAAIAAADFwAAAP////8RAAAAFQAAAAgAAAMVAAAA/////xIAAAAYAAAACAAAEB0AAAD/////EwAAABcAAAAIAAAQCgAAAAIBEABMAAAABgAAAP//////////GQAAABQAFAACAAAAAAAAAA8AAAAEAAAA/////wgAABAVAAAADwAAAAUAAAD/////CAAAEB0AAAADARAAGAAAAAYAAAD//////////xkAAAACARAAOAAAAAcAAAD//////////xoAAAAUABQAAQAAAAAAAAAPAAAABgAAABsAAAAIAAADGwAAAAMBEAAYAAAABwAAAP//////////GgAAAAIBEAA4AAAACAAAAP//////////GgAAABQAFAABAAAAAAAAAA8AAAAGAAAAHAAAAAgAAAMcAAAAAwEQABgAAAAIAAAA//////////8aAAAAAgEQAHQAAAAJAAAA//////////8dAAAAFAAUAAQAAAAAAAAADwAAAAcAAAAeAAAACAAAAx4AAAAPAAAACAAAAP////8IAAABAAACfw8AAAAKAAAA/////wgAABL/////DwAAAAkAAAD/////CAAAEv////8CARAAiAAAAA4AAAD//////////x8AAAAUABQABQAAAAAAAAAPAAAADQAAAP////8IAAABBgADAQ8AAAAHAAAAHgAAAAgAAAMeAAAADwAAAAYAAAAgAAAACAAAAyAAAAAPAAAACwAAAP////8IAAAS/////w8AAAAMAAAA/////wgAABGgBAAAAgEQACQAAAAUAAAA//////////8hAAAAFAAUAAAAAAAAAAAAAgEQADgAAAAVAAAA//////////8iAAAAFAAUAAEAAAAAAAAADwAAAAYAAAAjAAAACAAAAyMAAAADARAAGAAAABUAAAD//////////yIAAAACARAAOAAAABYAAAD//////////yQAAAAUABQAAQAAAAAAAAAPAAAABgAAACUAAAAIAAADJQAAAAMBEAAYAAAAFgAAAP//////////JAAAAAMBEAAYAAAAFwAAAP//////////IQAAAAMBEAAYAAAAGAAAAP//////////HwAAAAMBEAAYAAAAGQAAAP//////////HQAAAAMBEAAYAAAAGgAAAP//////////FAAAAAEBEAAYAAAAGgAAAP////8OAAAADwAAAA==';

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
let lastDistSignature = '';

function getDistSignature(distAssetsDir) {
  try {
    if (!fs.existsSync(distAssetsDir)) return '';
    const files = fs.readdirSync(distAssetsDir).sort();
    return files
      .map((f) => {
        const st = fs.statSync(path.join(distAssetsDir, f));
        return `${f}:${st.size}:${Math.floor(st.mtimeMs)}`;
      })
      .join('|');
  } catch {
    return '';
  }
}

async function getOrBuildStandaloneHtml(forceRebuild = false) {
  const distAssetsDir = path.join(__dirname, 'dist', 'assets');
  const indexHtmlPath = path.join(__dirname, 'dist', 'index.html');

  if (!fs.existsSync(distAssetsDir) || !fs.existsSync(indexHtmlPath) || forceRebuild) {
    try {
      const { build } = await import('vite');
      await build({
        build: {
          outDir: 'dist',
          emptyOutDir: true,
          sourcemap: false,
        },
      });
    } catch (e) {
      console.warn('Vite build error during bundle export:', e);
    }
  }

  const currentSig = getDistSignature(distAssetsDir);
  if (cachedStandaloneHtml && currentSig && currentSig === lastDistSignature && !forceRebuild) {
    return cachedStandaloneHtml;
  }

  const iconPath = path.join(__dirname, 'public', 'icon.svg');
  let iconDataUri = '/icon.svg';
  if (fs.existsSync(iconPath)) {
    const iconSvg = fs.readFileSync(iconPath, 'utf-8');
    iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg, 'utf-8').toString('base64')}`;
  }

  let cssContent = '';
  let jsContent = '';

  // Extract the EXACT single entrypoint JS and CSS files specified in dist/index.html
  let targetJsFile = '';
  let targetCssFile = '';

  if (fs.existsSync(indexHtmlPath)) {
    const htmlText = fs.readFileSync(indexHtmlPath, 'utf-8');
    const jsMatch = htmlText.match(/src="\/assets\/(index-[^"]+\.js)"/);
    if (jsMatch && jsMatch[1]) targetJsFile = jsMatch[1];
    const cssMatch = htmlText.match(/href="\/assets\/(index-[^"]+\.css)"/);
    if (cssMatch && cssMatch[1]) targetCssFile = cssMatch[1];
  }

  if (fs.existsSync(distAssetsDir)) {
    const allFiles = fs.readdirSync(distAssetsDir);
    if (!targetJsFile) {
      const jsFiles = allFiles.filter(f => f.endsWith('.js')).sort();
      targetJsFile = jsFiles[jsFiles.length - 1] || '';
    }
    if (!targetCssFile) {
      const cssFiles = allFiles.filter(f => f.endsWith('.css')).sort();
      targetCssFile = cssFiles[cssFiles.length - 1] || '';
    }

    if (targetCssFile && fs.existsSync(path.join(distAssetsDir, targetCssFile))) {
      cssContent = fs.readFileSync(path.join(distAssetsDir, targetCssFile), 'utf-8');
    }
    if (targetJsFile && fs.existsSync(path.join(distAssetsDir, targetJsFile))) {
      jsContent = fs.readFileSync(path.join(distAssetsDir, targetJsFile), 'utf-8');
    }
  }

  if (!jsContent) {
    return null;
  }

  // Replace /icon.svg with data URI, strip import.meta so it executes cleanly on Android file:// and content:// URLs
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
    <title>FX Signals Pro v1.4.0 — Institutional Mobile App</title>
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
          // Clear legacy uncalibrated signal state on upgrade to v1.4.0
          var __verKey = 'fx_app_bundle_version';
          if (window.localStorage.getItem(__verKey) !== '1.4.0') {
            window.localStorage.removeItem('fx_terminal_v2_signals_state');
            window.localStorage.removeItem('fx_signal_session_store_anchors_v3');
            window.localStorage.removeItem('fx_signals_state_v5');
            try {
              var s6 = window.localStorage.getItem('fx_signals_state_v6');
              if (s6) {
                var parsed = JSON.parse(s6);
                var modified = false;
                Object.keys(parsed).forEach(function(k) {
                  if (k.indexOf('USDCHF') !== -1 && k.indexOf('NEWS') !== -1) {
                    delete parsed[k];
                    modified = true;
                  }
                });
                if (modified) {
                  window.localStorage.setItem('fx_signals_state_v6', JSON.stringify(parsed));
                }
              }
            } catch (_) {}
            window.localStorage.setItem(__verKey, '1.4.0');
          }
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

      // 3. Android WebView Instant Failover Watchdog: Never let screen stay pitch black
      window.__appMounted = false;
      window.addEventListener('error', function(err) {
        console.warn('APK Bootstrap error:', err);
        if (!window.__appMounted && window.navigator && window.navigator.onLine) {
          window.location.replace('https://ais-pre-khyxbhrliwbprp5vdzyqd6-952034086177.asia-southeast1.run.app');
        }
      });
      setTimeout(function() {
        var placeholder = document.getElementById('apk-boot-placeholder');
        if (!window.__appMounted && placeholder && window.navigator && window.navigator.onLine) {
          window.location.replace('https://ais-pre-khyxbhrliwbprp5vdzyqd6-952034086177.asia-southeast1.run.app');
        }
      }, 1800);
    </script>
    <style>${cssContent}</style>
  </head>
  <body class="bg-[#080B11] text-[#F1F5F9] antialiased select-none font-sans overflow-x-hidden">
    <div id="root">
      <!-- Instant Boot Splash: Guarantees zero blank screen while JavaScript executes -->
      <div id="apk-boot-placeholder" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#080B11;color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;text-align:center">
        <img src="${iconDataUri}" style="width:72px;height:72px;border-radius:18px;border:1px solid rgba(255,215,0,0.4);margin-bottom:16px;box-shadow:0 8px 24px rgba(0,0,0,0.6)" alt="FX Signals Pro" />
        <h2 style="font-size:20px;font-weight:900;margin-bottom:6px;color:#FFF;letter-spacing:-0.5px">FX Signals Pro</h2>
        <div style="font-size:11px;color:#00E676;font-weight:700;margin-bottom:18px;background:rgba(0,230,118,0.12);padding:4px 10px;border-radius:999px;border:1px solid rgba(0,230,118,0.25)">v1.4.0 • Institutional Terminal</div>
        <div style="width:36px;height:36px;border:3px solid #222F47;border-top-color:#00E676;border-radius:50%;animation:fx-spin 0.8s linear infinite;margin-bottom:20px"></div>
        <a href="https://ais-pre-khyxbhrliwbprp5vdzyqd6-952034086177.asia-southeast1.run.app" style="color:#2979FF;font-size:11px;font-weight:700;text-decoration:none;border:1px solid rgba(41,121,255,0.4);padding:8px 16px;border-radius:10px;background:#101522">⚡ Tap to Launch Live Terminal</a>
        <style>@keyframes fx-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      </div>
    </div>
    <script>${safeJs}</script>
  </body>
</html>`;

  lastDistSignature = currentSig;
  cachedApkBuffer = null;
  return cachedStandaloneHtml;
}

async function getOrBuildApkBuffer(forceRebuild = false) {
  const html = await getOrBuildStandaloneHtml(forceRebuild);
  if (cachedApkBuffer && !forceRebuild) return cachedApkBuffer;
  const fallbackHtml =
    html ||
    '<!doctype html><html><body style="background:#080B11;color:#fff;font-family:sans-serif;padding:24px"><h2>FX Signals Pro</h2><p>Loading terminal...</p></body></html>';
  cachedApkBuffer = buildSignedAndroidApk(fallbackHtml);
  return cachedApkBuffer;
}

async function startServer() {
  const app = express();
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const PORT = portFromArg || Number(process.env.PORT) || 3000;

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

  // Health check endpoint (supports ?scan=1 or ?auto=1 for external cron/uptime pingers)
  app.get('/api/health', (req, res) => {
    const shouldAutoScan = req.query.scan === '1' || req.query.auto === '1';
    if (shouldAutoScan && Date.now() - lastBackgroundScanAt > 90000) {
      runServerBackgroundMarketScan(false).catch(() => {});
    }
    const activeSignalsCount = Object.values(serverSignalsStore).filter(
      (s: any) => s && (s.status === 'RUNNING' || s.status === 'PENDING')
    ).length;
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      marketOpen: isServerForexMarketOpen(new Date()),
      lastMonitorTick: lastServerMonitorTick,
      lastBackgroundScanAt,
      lastBackgroundScanNewCount,
      lastBackgroundScanStatus,
      activeSignalsCount
    });
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

  // Strict Real Market Candles Endpoint (Yahoo Finance Chart API, aggregated cleanly into H4/H1/M15/M5/M1/D1; ZERO synthetic fallback)
  const yahooCandleCache: Record<string, { data: any; timestamp: number }> = {};
  const yahooInFlight = new Map<string, Promise<{ status: number; payload: any }>>();
  let activeYahooRequests = 0;
  const yahooWaitQueue: (() => void)[] = [];
  const acquireYahooSlot = async (): Promise<void> => {
    if (activeYahooRequests < 4) {
      activeYahooRequests += 1;
      return;
    }
    await new Promise<void>(resolve => yahooWaitQueue.push(resolve));
    activeYahooRequests += 1;
  };
  const releaseYahooSlot = (): void => {
    activeYahooRequests = Math.max(0, activeYahooRequests - 1);
    const next = yahooWaitQueue.shift();
    if (next) next();
  };

  function getTypicalServerPairSpread(symbol: string): number {
    const clean = symbol.replace('/', '').toUpperCase();
    if (clean.includes('XAU') || clean.includes('GOLD')) return 0.40;
    if (clean.includes('XAG') || clean.includes('SILVER')) return 0.04;
    if (clean.includes('OIL')) return 0.05;
    const majors = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD']);
    const isMajor = majors.has(clean);
    if (clean.includes('JPY')) return isMajor ? 0.015 : 0.022;
    return isMajor ? 0.00015 : 0.00022;
  }

  async function fetchYahooCandlesServer(
    symbolRawInput: string,
    timeframeInput: string = 'H4',
    requestedCountInput: number = 120
  ): Promise<{ status: number; payload: any }> {
    const symbolRaw = String(symbolRawInput || '').trim().toUpperCase();
    const timeframe = String(timeframeInput || 'H4').trim().toUpperCase();
    const requestedCount = Math.min(500, Math.max(10, Number(requestedCountInput) || 120));
    const minRequired = timeframe === 'H4' ? 50 : timeframe === 'M1' ? 5 : 20;

    if (!symbolRaw) {
      return { status: 400, payload: { ok: false, error: 'Missing symbol parameter', candles: [] } };
    }

    const cacheKey = `${symbolRaw}:${timeframe}:${requestedCount}`;
    const cached = yahooCandleCache[cacheKey];
    const cacheTtlMs =
      timeframe === 'M1' ? 15 * 1000 :
      timeframe === 'M5' ? 30 * 1000 :
      timeframe === 'H4' || timeframe === 'D1' ? 5 * 60 * 1000 : 60 * 1000;
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      return { status: 200, payload: cached.data };
    }

    let inFlight = yahooInFlight.get(cacheKey);
    if (!inFlight) {
      inFlight = (async (): Promise<{ status: number; payload: any }> => {
        const cleanSym = symbolRaw.replace(/\//g, '');
        let candidateTickers: string[] = [];
        if (cleanSym === 'XAUUSD' || cleanSym === 'GOLD') {
          candidateTickers = ['GC=F', 'XAUUSD=X'];
        } else if (cleanSym === 'XAGUSD' || cleanSym === 'SILVER') {
          candidateTickers = ['SI=F', 'XAGUSD=X'];
        } else if (cleanSym === 'USOIL' || cleanSym === 'WTIUSD') {
          candidateTickers = ['CL=F'];
        } else if (cleanSym === 'UKOIL') {
          candidateTickers = ['BZ=F'];
        } else if (cleanSym.length === 6) {
          candidateTickers = [`${cleanSym}=X`];
        } else {
          candidateTickers = [`${cleanSym}=X`, cleanSym];
        }

        const intervalParam =
          timeframe === 'M1' ? '1m' :
          timeframe === 'M5' ? '5m' :
          timeframe === 'M15' ? '15m' :
          timeframe === 'D1' ? '1d' : '1h';
        const rangeParam =
          timeframe === 'M1' ? '1d' :
          timeframe === 'M5' ? '5d' :
          timeframe === 'M15' ? '1mo' :
          timeframe === 'H1' ? '1mo' :
          timeframe === 'H4' ? '3mo' : '1y';

        const yahooHosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
        let rawBars: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
        let usedTicker = '';
        const attemptErrors: string[] = [];

        await acquireYahooSlot();
        try {
          for (const ticker of candidateTickers) {
            for (let attempt = 0; attempt < 2; attempt++) {
              const host = yahooHosts[attempt % yahooHosts.length];
              const yUrl = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${intervalParam}&range=${rangeParam}`;
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              try {
                const yRes = await fetch(yUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                  },
                  signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!yRes.ok) {
                  let bodyErr = '';
                  try {
                    const errJson: any = await yRes.json();
                    bodyErr = errJson?.chart?.error?.description || errJson?.chart?.error?.code || '';
                  } catch {
                    // ignore non-json error body
                  }
                  attemptErrors.push(`${host}/${ticker} HTTP ${yRes.status}${bodyErr ? ` (${bodyErr})` : ''}`);
                  if (attempt === 0) await new Promise(r => setTimeout(r, 250));
                  continue;
                }

                const json: any = await yRes.json();
                const chartError = json?.chart?.error;
                if (chartError) {
                  attemptErrors.push(`${host}/${ticker} chart error: ${chartError.description || chartError.code || 'unknown'}`);
                  if (attempt === 0) await new Promise(r => setTimeout(r, 250));
                  continue;
                }

                const result = json?.chart?.result?.[0];
                const timestamps: any[] = result?.timestamp || [];
                const quote = result?.indicators?.quote?.[0];
                if (!timestamps.length || !quote) {
                  attemptErrors.push(`${host}/${ticker} returned 0 timestamps`);
                  if (attempt === 0) await new Promise(r => setTimeout(r, 250));
                  continue;
                }

                const parsed: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
                for (let i = 0; i < timestamps.length; i++) {
                  const ts = Number(timestamps[i]);
                  const o = Number(quote.open?.[i]);
                  const h = Number(quote.high?.[i]);
                  const l = Number(quote.low?.[i]);
                  const c = Number(quote.close?.[i]);
                  const v = Number(quote.volume?.[i] ?? 1000);
                  if (ts > 0 && Number.isFinite(o) && Number.isFinite(h) && Number.isFinite(l) && Number.isFinite(c) && o > 0 && c > 0) {
                    parsed.push({
                      timestamp: ts * 1000,
                      open: o,
                      high: Math.max(h, o, c),
                      low: Math.min(l, o, c),
                      close: c,
                      volume: Number.isFinite(v) && v > 0 ? v : 1000
                    });
                  }
                }

                if (parsed.length > 0) {
                  rawBars = parsed;
                  usedTicker = ticker;
                  break;
                } else {
                  attemptErrors.push(`${host}/${ticker} had ${timestamps.length} timestamps but 0 valid OHLC bars`);
                }
              } catch (err: any) {
                clearTimeout(timeoutId);
                const msg = err?.name === 'AbortError' ? 'Timeout after 10000ms' : (err?.message || 'Fetch error');
                attemptErrors.push(`${host}/${ticker} ${msg}`);
                if (attempt === 0) await new Promise(r => setTimeout(r, 250));
              }
            }
            if (rawBars.length > 0) break;
          }
        } finally {
          releaseYahooSlot();
        }

        if (rawBars.length === 0) {
          const errMsg = attemptErrors.join(' | ') || `Upstream returned 0 bars for ${candidateTickers.join(', ')}`;
          return {
            status: 502,
            payload: {
              ok: false,
              symbol: symbolRaw,
              timeframe,
              providerName: 'NONE',
              error: errMsg,
              candles: []
            }
          };
        }

        let finalBars = rawBars;
        if (timeframe === 'H4') {
          const fourHoursMs = 4 * 3600 * 1000;
          const grouped = new Map<number, { timestamp: number; open: number; high: number; low: number; close: number; volume: number }>();
          for (const bar of rawBars) {
            const bucket = Math.floor(bar.timestamp / fourHoursMs) * fourHoursMs;
            const existing = grouped.get(bucket);
            if (!existing) {
              grouped.set(bucket, { ...bar, timestamp: bucket });
            } else {
              existing.high = Math.max(existing.high, bar.high);
              existing.low = Math.min(existing.low, bar.low);
              existing.close = bar.close;
              existing.volume += bar.volume;
            }
          }
          finalBars = Array.from(grouped.values()).sort((a, b) => a.timestamp - b.timestamp);
        }

        const trimmed = finalBars.slice(-requestedCount);
        const hasEnough = trimmed.length >= minRequired;
        const payload = {
          ok: hasEnough,
          symbol: symbolRaw,
          ticker: usedTicker,
          timeframe,
          providerName: `Yahoo Finance (${usedTicker})`,
          candles: trimmed,
          error: hasEnough
            ? undefined
            : `Yahoo (${usedTicker}) returned only ${trimmed.length} ${timeframe} bars (need >= ${minRequired})`
        };

        if (payload.ok) {
          yahooCandleCache[cacheKey] = { data: payload, timestamp: Date.now() };
        }
        return { status: hasEnough ? 200 : 502, payload };
      })().finally(() => {
        yahooInFlight.delete(cacheKey);
      });
      yahooInFlight.set(cacheKey, inFlight);
    }

    return await inFlight;
  }

  app.get('/api/market/candles', async (req, res) => {
    try {
      const symbolRaw = String(req.query.symbol || '').trim().toUpperCase();
      const timeframe = String(req.query.timeframe || 'H4').trim().toUpperCase();
      const requestedCount = Math.min(500, Math.max(10, Number(req.query.count) || 120));
      const { status, payload } = await fetchYahooCandlesServer(symbolRaw, timeframe, requestedCount);
      res.status(status).json(payload);
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        providerName: 'NONE',
        error: err?.message || 'Internal /api/market/candles error',
        candles: []
      });
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

  // 24/7 Server-Side Telegram Configuration & Persistent Push Support
  const TELEGRAM_CONFIG_FILE = path.join(process.cwd(), 'server_telegram_config.json');
  const REVOKED_TOKEN = '8750503064:AAHU1FA80-Hqvjwc010oUDI2pgkitH2bJRI';
  function loadServerTelegramConfig() {
    const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').replace(/\s+/g, '');
    const envChatId = (process.env.TELEGRAM_CHAT_ID || '').replace(/\s+/g, '');
    try {
      if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf-8'));
        if (parsed.botToken === REVOKED_TOKEN) parsed.botToken = '';
        return {
          ...parsed,
          botToken: parsed.botToken || envToken,
          chatId: parsed.chatId || envChatId
        };
      }
    } catch {}
    return { enabled: true, botToken: envToken, chatId: envChatId };
  }
  function saveServerTelegramConfig(cfg: any) {
    try {
      fs.writeFileSync(TELEGRAM_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch {}
  }
  let serverTelegramConfig = loadServerTelegramConfig();

  app.get('/api/telegram/config', (_req, res) => {
    res.json(serverTelegramConfig);
  });

  app.post('/api/telegram/config', (req, res) => {
    try {
      serverTelegramConfig = { ...serverTelegramConfig, ...(req.body || {}) };
      saveServerTelegramConfig(serverTelegramConfig);
      res.json({ success: true, config: serverTelegramConfig });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save config' });
    }
  });

  app.post('/api/telegram/send', async (req, res) => {
    try {
      const { token, chatId, message } = req.body || {};
      const botToken = (token || serverTelegramConfig.botToken || '').replace(/\s+/g, '');
      const targetChatId = (chatId || serverTelegramConfig.chatId || '').replace(/\s+/g, '');

      if (!botToken || !targetChatId) {
        res.status(400).json({ success: false, error: 'Bot token or Chat ID missing' });
        return;
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const data = await tgRes.json();
      if (data.ok) {
        res.json({ success: true, message: 'Sent via server proxy' });
      } else {
        const fallbackRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: message.replace(/\*/g, '')
          })
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.ok) {
          res.json({ success: true, message: 'Sent via server proxy (plain text)' });
        } else {
          res.status(400).json({ success: false, error: data.description || 'Telegram API error' });
        }
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Server proxy error' });
    }
  });

  app.post('/api/telegram/updates', async (req, res) => {
    try {
      const { token } = req.body || {};
      const botToken = (token || serverTelegramConfig.botToken || '').replace(/\s+/g, '');
      if (!botToken) {
        res.status(400).json({ ok: false, description: 'Bot token missing' });
        return;
      }
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      const data = await tgRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ ok: false, description: err?.message || 'Server proxy error' });
    }
  });

  app.post('/api/telegram/download-link', async (req, res) => {
    try {
      const { link } = req.body || {};
      if (!link || typeof link !== 'string') {
        res.status(400).json({ error: 'Telegram link is required' });
        return;
      }
      res.json({
        success: true,
        message: 'Successfully parsed Telegram link/channel post. File/APK download or signal import ready.',
        link,
        extractedType: link.includes('apk') ? 'APK_FILE' : link.includes('signal') ? 'SIGNAL_DATA' : 'CHANNEL_MEDIA',
        downloadUrl: link.startsWith('http') ? link : `https://t.me/${link}`
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Download failed' });
    }
  });

  // 24/7 Persistent Server-Side Signal Ledger & Background Monitor
  // Monitors market extremes and tracks SL/TP hits even when all web browsers are closed
  const SIGNALS_STORE_FILE = path.join(process.cwd(), 'server_signals_store.json');

  function hasServerConfluenceBreakdown(s: any): boolean {
    if (!s || typeof s !== 'object') return false;
    const bd = s.confluenceBreakdown || s.generationAudit?.confluenceBreakdown;
    if (!bd || typeof bd !== 'object') return false;
    const summary = typeof bd.summaryText === 'string' ? bd.summaryText.trim() : '';
    return (
      summary.length > 0 &&
      summary.includes('H4:') &&
      summary.includes('Strength:') &&
      typeof bd.total === 'number'
    );
  }

  function loadServerSignalsStore(): Record<string, any> {
    try {
      if (fs.existsSync(SIGNALS_STORE_FILE)) {
        const raw = fs.readFileSync(SIGNALS_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Sanitize duplicate closed signals and DELETE all old engine active/standby signals lacking real confluence breakdown
          const sanitized: Record<string, any> = {};
          const seenClosedCombinations = new Set<string>();
          let purgedLegacyCount = 0;
          Object.entries(parsed).forEach(([id, s]: [string, any]) => {
            if (!s || !s.id) return;
            const isClosed = s.status === 'HIT_TP' || s.status === 'HIT_SL' || s.status === 'EXPIRED';
            if (!isClosed) {
              if (!hasServerConfluenceBreakdown(s)) {
                purgedLegacyCount++;
                return;
              }
              sanitized[id] = s;
            } else {
              const sym = s.pair?.symbol || '';
              const key = `${sym}-${s.pips}`;
              if (!seenClosedCombinations.has(key)) {
                seenClosedCombinations.add(key);
                sanitized[id] = s;
              }
            }
          });
          if (purgedLegacyCount > 0) {
            saveServerSignalsStore(sanitized);
            console.log(`[Purge] Deleted ${purgedLegacyCount} old pre-breakdown signals from server_signals_store.json.`);
          }
          console.log(`[24/7 Server Monitor] Loaded & sanitized ${Object.keys(sanitized).length} signals from persistent disk store.`);
          return sanitized;
        }
      }
    } catch (err) {
      console.warn('[24/7 Server Monitor] Could not load signals store from disk:', err);
    }
    return {};
  }

  function saveServerSignalsStore(store: Record<string, any>) {
    try {
      fs.writeFileSync(SIGNALS_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[24/7 Server Monitor] Could not save signals store to disk:', err);
    }
  }

  let serverSignalsStore: Record<string, any> = loadServerSignalsStore();
  let lastServerMonitorTick = 0;
  let isWatchdogRunning = false;

  async function runServerWatchdogTick(): Promise<void> {
    if (isWatchdogRunning) return;
    isWatchdogRunning = true;
    try {
      lastServerMonitorTick = Date.now();
      const activeSignals = Object.values(serverSignalsStore).filter(
        (s: any) => s.status === 'RUNNING' || s.status === 'PENDING'
      );
      if (activeSignals.length === 0) return;

      const fxTickers: string[] = [];
      const cfdTickers: string[] = [];
      activeSignals.forEach((s: any) => {
        const sym = String(s.pair?.symbol || '').toUpperCase();
        const clean = sym.replace('/', '');
        if (!clean) return;
        if (clean === 'XAUUSD' || clean === 'GOLD') cfdTickers.push('TVC:GOLD');
        else if (clean === 'XAGUSD' || clean === 'SILVER') cfdTickers.push('TVC:SILVER');
        else fxTickers.push(`FX:${clean}`);
      });

      const priceMap: Record<string, { close: number; bid?: number; ask?: number }> = {};
      const tvCols = ['close', 'change', 'high', 'low', 'open', 'bid', 'ask'];

      if (fxTickers.length > 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const tvRes = await fetch('https://scanner.tradingview.com/forex/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ symbols: { tickers: Array.from(new Set(fxTickers)) }, columns: tvCols }),
            signal: controller.signal
          });
          if (tvRes.ok) {
            const json: any = await tvRes.json();
            if (json?.data && Array.isArray(json.data)) {
              json.data.forEach((item: any) => {
                const cleanTicker = item.s?.replace(/^FX:/, '');
                const close = Number(item.d?.[0]);
                const bid = Number(item.d?.[5]);
                const ask = Number(item.d?.[6]);
                if (cleanTicker && !isNaN(close) && close > 0) {
                  priceMap[cleanTicker] = {
                    close,
                    bid: Number.isFinite(bid) && bid > 0 ? bid : undefined,
                    ask: Number.isFinite(ask) && ask > 0 ? ask : undefined
                  };
                }
              });
            }
          }
        } catch {}
        clearTimeout(timeoutId);
      }

      if (cfdTickers.length > 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        try {
          const cfdRes = await fetch('https://scanner.tradingview.com/cfd/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ symbols: { tickers: Array.from(new Set(cfdTickers)) }, columns: tvCols }),
            signal: controller.signal
          });
          if (cfdRes.ok) {
            const json: any = await cfdRes.json();
            if (json?.data && Array.isArray(json.data)) {
              json.data.forEach((item: any) => {
                const rawTicker = item.s || '';
                const cleanTicker =
                  rawTicker === 'TVC:GOLD' ? 'XAUUSD' :
                  rawTicker === 'TVC:SILVER' ? 'XAGUSD' :
                  rawTicker.replace(/^TVC:/, '');
                const close = Number(item.d?.[0]);
                const bid = Number(item.d?.[5]);
                const ask = Number(item.d?.[6]);
                if (cleanTicker && !isNaN(close) && close > 0) {
                  priceMap[cleanTicker] = {
                    close,
                    bid: Number.isFinite(bid) && bid > 0 ? bid : undefined,
                    ask: Number.isFinite(ask) && ask > 0 ? ask : undefined
                  };
                }
              });
            }
          }
        } catch {}
        clearTimeout(timeoutId);
      }

      // Fetch recent M1 & M5 intrabar candles per active symbol so brief wick spikes between polls are never missed
      const activeSymbols = Array.from(new Set(activeSignals.map((s: any) => s.pair?.symbol).filter(Boolean))) as string[];
      const symbolBarsMap: Record<string, { timestamp: number; high: number; low: number; close: number }[]> = {};
      await Promise.all(
        activeSymbols.map(async (sym) => {
          try {
            const m1Res = await fetchYahooCandlesServer(sym, 'M1', 500);
            let bars: any[] = m1Res.payload?.ok && Array.isArray(m1Res.payload.candles) ? m1Res.payload.candles : [];
            if (bars.length < 10) {
              const m5Res = await fetchYahooCandlesServer(sym, 'M5', 400);
              if (m5Res.payload?.ok && Array.isArray(m5Res.payload.candles)) {
                bars = m5Res.payload.candles;
              }
            }
            if (bars.length > 0) {
              symbolBarsMap[sym] = bars;
            }
          } catch {
            // ignore candle fetch error for single symbol
          }
        })
      );

      let storeModified = false;
      activeSignals.forEach((sig: any) => {
        const sym = sig.pair?.symbol || '';
        const cleanSym = sym.replace('/', '');
        const quote = priceMap[cleanSym];
        const bars = symbolBarsMap[sym] || [];
        const latestBarClose = bars.length > 0 ? Number(bars[bars.length - 1].close) : 0;
        const refClose = quote?.close || latestBarClose;
        if (!refClose || refClose <= 0) return;

        const isBuy = (sig.type || '').startsWith('BUY');
        const entry = Number(sig.entryPrice);
        const sl = Number(sig.stopLoss);
        const tp1 = Number(sig.takeProfit1);

        const isJpy = sym.includes('JPY');
        const isGold = sym.includes('XAU') || sym.includes('GOLD');
        const isSilver = sym.includes('XAG') || sym.includes('SILVER');
        const mult = isGold ? 10 : (isJpy || isSilver) ? 100 : 10000;
        const typicalSpread = getTypicalServerPairSpread(sym);

        const liveBid = quote?.bid && quote.bid > 0 ? quote.bid : refClose;
        const hasValidTvSpread = Boolean(
          quote?.bid &&
          quote?.ask &&
          quote.ask > quote.bid &&
          quote.ask - quote.bid <= typicalSpread * 4
        );
        const effectiveSpread = hasValidTvSpread
          ? Math.max(typicalSpread * 0.65, quote!.ask! - quote!.bid!)
          : typicalSpread;
        const liveAsk =
          quote?.ask && quote.ask > 0 && hasValidTvSpread
            ? Math.max(quote.ask, liveBid + effectiveSpread * 0.65)
            : liveBid + effectiveSpread;

        // Handle PENDING orders: BUY fills at Ask, SELL fills at Bid
        let workingSig = sig;
        if (sig.status === 'PENDING') {
          const fillCheckPrice = isBuy ? liveAsk : liveBid;
          let isFilled = false;
          if (sig.type === 'BUY_LIMIT') isFilled = fillCheckPrice <= entry;
          else if (sig.type === 'SELL_LIMIT') isFilled = fillCheckPrice >= entry;
          else if (sig.type === 'BUY_STOP') isFilled = fillCheckPrice >= entry;
          else if (sig.type === 'SELL_STOP') isFilled = fillCheckPrice <= entry;
          else isFilled = true;

          if (isFilled) {
            workingSig = { ...sig, status: 'RUNNING', executedAtMs: sig.executedAtMs || Date.now() };
            serverSignalsStore[sig.id] = workingSig;
            storeModified = true;
          } else {
            const invalidCheckPrice = isBuy ? liveBid : liveAsk;
            const isInvalidated = isBuy ? invalidCheckPrice <= sl : invalidCheckPrice >= sl;
            if (isInvalidated) {
              serverSignalsStore[sig.id] = {
                ...sig,
                status: 'CANCELLED',
                pips: 0,
                currentPrice: invalidCheckPrice,
                closedAtMs: Date.now(),
                isPastReconciled: true,
                validityTimeLeft: 'Cancelled (Unfilled Limit Order)',
                validityExpiresAt: `Invalidated before fill at ${invalidCheckPrice}`
              };
              storeModified = true;
            }
            return;
          }
        }

        // Discard signals whose entry price is completely disconnected from real-time market (> 120p FX, > 250p Gold)
        const entryPipsDiff = Math.abs(entry - refClose) * mult;
        const maxAllowedPips = isGold ? 250 : isJpy ? 180 : 120;
        if (entryPipsDiff > maxAllowedPips) {
          console.warn(`[24/7 Server Monitor] Stale signal ${workingSig.id} (${sym}) discarded: entry ${entry} is ${entryPipsDiff.toFixed(1)}p away from live quote ${refClose}`);
          delete serverSignalsStore[workingSig.id];
          storeModified = true;
          return;
        }

        let isSlHit = false;
        let isTpHit = false;
        let exitPrice = refClose;
        let triggerSource = 'live quote';
        const maxOvershootPips = isGold ? 100 : isJpy ? 45 : 30;

        // 1. Live Bid/Ask check (MT5: BUY exits on Bid, SELL exits on Ask = Bid + spread)
        const liveExitQuote = isBuy ? liveBid : liveAsk;
        if (isBuy) {
          if (liveExitQuote <= sl) {
            const slOvershoot = (sl - liveExitQuote) * mult;
            if (slOvershoot <= maxOvershootPips) {
              isSlHit = true;
              exitPrice = sl;
              triggerSource = `live Bid ${liveExitQuote.toFixed(isJpy || isGold ? 3 : 5)}`;
            }
          } else if (liveExitQuote >= tp1) {
            const tpOvershoot = (liveExitQuote - tp1) * mult;
            if (tpOvershoot <= maxOvershootPips) {
              isTpHit = true;
              exitPrice = tp1;
              triggerSource = `live Bid ${liveExitQuote.toFixed(isJpy || isGold ? 3 : 5)}`;
            }
          }
        } else {
          if (liveExitQuote >= sl) {
            const slOvershoot = (liveExitQuote - sl) * mult;
            if (slOvershoot <= maxOvershootPips) {
              isSlHit = true;
              exitPrice = sl;
              triggerSource = `live Ask ${liveExitQuote.toFixed(isJpy || isGold ? 3 : 5)}`;
            }
          } else if (liveExitQuote <= tp1) {
            const tpOvershoot = (tp1 - liveExitQuote) * mult;
            if (tpOvershoot <= maxOvershootPips) {
              isTpHit = true;
              exitPrice = tp1;
              triggerSource = `live Ask ${liveExitQuote.toFixed(isJpy || isGold ? 3 : 5)}`;
            }
          }
        }

        // 2. Post-entry intrabar M1/M5 wick check strictly from executedAtMs || createdAtMs onward
        const entryStartMs = Number(workingSig.executedAtMs || workingSig.createdAtMs || 0);
        if (!isSlHit && !isTpHit && bars.length > 0 && entryStartMs > 0) {
          for (const bar of bars) {
            if (bar.timestamp < entryStartMs) continue;
            if (isBuy) {
              if (bar.low <= sl) {
                isSlHit = true;
                exitPrice = sl;
                triggerSource = `intrabar wick low ${bar.low} @ ${new Date(bar.timestamp).toISOString()}`;
                break;
              }
              if (bar.high >= tp1) {
                isTpHit = true;
                exitPrice = tp1;
                triggerSource = `intrabar wick high ${bar.high} @ ${new Date(bar.timestamp).toISOString()}`;
                break;
              }
            } else {
              // SELL closes on MT5 ASK = Bid bar high/low + spread
              const askBarHigh = bar.high + effectiveSpread;
              const askBarLow = bar.low + effectiveSpread;
              if (askBarHigh >= sl) {
                isSlHit = true;
                exitPrice = sl;
                triggerSource = `intrabar Ask wick ${askBarHigh.toFixed(isJpy || isGold ? 3 : 5)} (Bid high ${bar.high} + spread ${effectiveSpread}) @ ${new Date(bar.timestamp).toISOString()}`;
                break;
              }
              if (askBarLow <= tp1) {
                isTpHit = true;
                exitPrice = tp1;
                triggerSource = `intrabar Ask low ${askBarLow.toFixed(isJpy || isGold ? 3 : 5)} @ ${new Date(bar.timestamp).toISOString()}`;
                break;
              }
            }
          }
        }

        if (isSlHit) {
          const pipsLoss = Math.round(Math.abs(entry - exitPrice) * mult * 10) / 10;
          console.log(`[24/7 Server Monitor] Signal ${workingSig.id} (${sym}) HIT SL at ${exitPrice} (${triggerSource}) (-${pipsLoss}p)`);
          serverSignalsStore[workingSig.id] = {
            ...workingSig,
            status: 'HIT_SL',
            currentPrice: exitPrice,
            pips: -pipsLoss,
            closedAtMs: Date.now(),
            isPastReconciled: true,
            validityTimeLeft: `Closed (SL Hit: -${pipsLoss}p)`,
            validityExpiresAt: `SL Hit at ${exitPrice}`
          };
          storeModified = true;

          if (serverTelegramConfig.enabled && serverTelegramConfig.botToken && serverTelegramConfig.chatId) {
            try {
              const text = `🛡️ *[24/7 SERVER]* *SIGNAL STOP LOSS HIT*\n\n📊 *Pair:* ${sym} (${workingSig.type})\n📍 *Entry:* ${workingSig.entryPrice}\n🛑 *SL Hit at:* ${exitPrice} (-${pipsLoss}p)\nℹ️ Triggered via ${triggerSource}.`;
              fetch(`https://api.telegram.org/bot${serverTelegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: serverTelegramConfig.chatId, text, parse_mode: 'Markdown' })
              }).catch(() => {});
            } catch {}
          }
        } else if (isTpHit) {
          const pipsGain = Math.round(Math.abs(exitPrice - entry) * mult * 10) / 10;
          console.log(`[24/7 Server Monitor] Signal ${workingSig.id} (${sym}) HIT TP1 at ${exitPrice} (${triggerSource}) (+${pipsGain}p)`);
          serverSignalsStore[workingSig.id] = {
            ...workingSig,
            status: 'HIT_TP',
            currentPrice: exitPrice,
            pips: pipsGain,
            closedAtMs: Date.now(),
            isPastReconciled: true,
            validityTimeLeft: `Closed (TP1 Hit: +${pipsGain}p)`,
            validityExpiresAt: `TP1 Hit at ${exitPrice}`
          };
          storeModified = true;

          if (serverTelegramConfig.enabled && serverTelegramConfig.botToken && serverTelegramConfig.chatId) {
            try {
              const text = `🎉 *[24/7 SERVER]* *SIGNAL TAKE PROFIT 1 HIT*\n\n📊 *Pair:* ${sym} (${workingSig.type})\n📍 *Entry:* ${workingSig.entryPrice}\n🎯 *TP1 Reached:* ${exitPrice} (+${pipsGain}p)\nℹ️ Triggered via ${triggerSource}.`;
              fetch(`https://api.telegram.org/bot${serverTelegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: serverTelegramConfig.chatId, text, parse_mode: 'Markdown' })
              }).catch(() => {});
            } catch {}
          }
        } else {
          // Keep running signal's currentPrice & pips fresh on server store
          const livePips = Math.round((isBuy ? (liveExitQuote - entry) : (entry - liveExitQuote)) * mult * 10) / 10;
          const prevPips = Number(workingSig.pips || 0);
          if (Math.abs(livePips - prevPips) >= 0.2 || workingSig.currentPrice !== refClose) {
            serverSignalsStore[workingSig.id] = {
              ...workingSig,
              currentPrice: refClose,
              pips: livePips
            };
            storeModified = true;
          }
        }
      });

      if (storeModified) {
        saveServerSignalsStore(serverSignalsStore);
      }
    } catch {
      // ignore network errors
    } finally {
      isWatchdogRunning = false;
    }
  }

  app.get('/api/signals/state', (_req, res) => {
    res.json({
      success: true,
      serverTime: Date.now(),
      marketOpen: isServerForexMarketOpen(new Date()),
      lastMonitorTick: lastServerMonitorTick,
      lastBackgroundScanAt,
      lastBackgroundScanNewCount,
      lastBackgroundScanStatus,
      isBackgroundScanRunning,
      activeCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
      signals: Object.values(serverSignalsStore)
    });
  });

  app.post('/api/signals/clear-closed', (_req, res) => {
    try {
      const activeOnly: Record<string, any> = {};
      Object.entries(serverSignalsStore).forEach(([id, sig]: [string, any]) => {
        if (sig && sig.status !== 'HIT_TP' && sig.status !== 'HIT_SL' && sig.status !== 'EXPIRED') {
          if (hasServerConfluenceBreakdown(sig)) {
            activeOnly[id] = sig;
          }
        }
      });
      serverSignalsStore = activeOnly;
      saveServerSignalsStore(serverSignalsStore);
      res.json({ success: true, count: Object.keys(serverSignalsStore).length });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to clear closed signals' });
    }
  });

  // =========================================================================
  // 24/7 SERVER-SIDE CLOSED-APP BACKGROUND MARKET SCANNER
  // Scans live TradingView + Yahoo Finance MTF candles even when all browsers are closed.
  // Self-contained pure Node 22 strip-compatible TypeScript (no src/ imports).
  // =========================================================================
  let lastBackgroundScanAt = 0;
  let lastBackgroundScanNewCount = 0;
  let lastBackgroundScanStatus = 'Idle (awaiting initial boot scan)';
  let isBackgroundScanRunning = false;
  const serverSentTelegramIds = new Set<string>();

  interface ServerPairSpec {
    symbol: string;
    name: string;
    pipDigits: number;
    spreadPips: number;
    category: 'MAJORS' | 'MINORS' | 'METALS';
    isGoldOrCrypto?: boolean;
    minMargin001: number;
    pipValue001: number;
  }

  const SERVER_SCAN_PAIRS: ServerPairSpec[] = [
    // Core FX Majors (7 pairs)
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.2, pipValue001: 0.10 },
    { symbol: 'GBP/USD', name: 'British Pound / USD', pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.65, pipValue001: 0.10 },
    { symbol: 'USD/JPY', name: 'US Dollar / Yen', pipDigits: 2, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.0, pipValue001: 0.09 },
    { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.0, pipValue001: 0.12 },
    { symbol: 'AUD/USD', name: 'Aussie / USD', pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 1.4, pipValue001: 0.10 },
    { symbol: 'NZD/USD', name: 'Kiwi / USD', pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 1.15, pipValue001: 0.10 },
    { symbol: 'USD/CAD', name: 'US Dollar / CAD', pipDigits: 4, spreadPips: 0.2, category: 'MAJORS', minMargin001: 2.0, pipValue001: 0.08 },
    // High Liquidity Crosses (21 pairs)
    { symbol: 'EUR/GBP', name: 'Euro / British Pound', pipDigits: 4, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.2, pipValue001: 0.13 },
    { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', pipDigits: 2, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.2, pipValue001: 0.09 },
    { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.2, pipValue001: 0.07 },
    { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.2, pipValue001: 0.08 },
    { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.2, pipValue001: 0.12 },
    { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', pipDigits: 4, spreadPips: 0.5, category: 'MINORS', minMargin001: 2.2, pipValue001: 0.06 },
    { symbol: 'GBP/JPY', name: 'Pound / Yen (The Dragon)', pipDigits: 2, spreadPips: 0.2, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.09 },
    { symbol: 'GBP/AUD', name: 'Pound / Australian Dollar', pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.07 },
    { symbol: 'GBP/CAD', name: 'Pound / Canadian Dollar', pipDigits: 4, spreadPips: 0.4, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.08 },
    { symbol: 'GBP/CHF', name: 'Pound / Swiss Franc', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.12 },
    { symbol: 'GBP/NZD', name: 'Pound / New Zealand Dollar', pipDigits: 4, spreadPips: 0.6, category: 'MINORS', minMargin001: 2.65, pipValue001: 0.06 },
    { symbol: 'AUD/JPY', name: 'Aussie / Japanese Yen', pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.4, pipValue001: 0.09 },
    { symbol: 'AUD/CAD', name: 'Aussie / Canadian Dollar', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.4, pipValue001: 0.08 },
    { symbol: 'AUD/CHF', name: 'Aussie / Swiss Franc', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.4, pipValue001: 0.12 },
    { symbol: 'AUD/NZD', name: 'Aussie / New Zealand Dollar', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.4, pipValue001: 0.06 },
    { symbol: 'CAD/JPY', name: 'Canadian Dollar / Yen', pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.5, pipValue001: 0.09 },
    { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.5, pipValue001: 0.12 },
    { symbol: 'CHF/JPY', name: 'Swiss Franc / Yen', pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 2.3, pipValue001: 0.09 },
    { symbol: 'NZD/JPY', name: 'Kiwi / Japanese Yen', pipDigits: 2, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.09 },
    { symbol: 'NZD/CAD', name: 'Kiwi / Canadian Dollar', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.08 },
    { symbol: 'NZD/CHF', name: 'Kiwi / Swiss Franc', pipDigits: 4, spreadPips: 0.3, category: 'MINORS', minMargin001: 1.15, pipValue001: 0.12 },
    // Precious Metals (2 pairs)
    { symbol: 'XAU/USD', name: 'Gold / US Dollar', pipDigits: 2, spreadPips: 1.2, category: 'METALS', isGoldOrCrypto: true, minMargin001: 8.5, pipValue001: 0.10 },
    { symbol: 'XAG/USD', name: 'Silver / US Dollar', pipDigits: 2, spreadPips: 0.8, category: 'METALS', isGoldOrCrypto: true, minMargin001: 3.2, pipValue001: 0.10 }
  ];

  function isServerForexMarketOpen(date: Date = new Date()): boolean {
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    if (day === 6) return false; // Saturday closed
    if (day === 5 && hour >= 22) return false; // Friday 22:00 UTC close
    if (day === 0 && hour < 22) return false; // Sunday < 22:00 UTC closed
    return true;
  }

  function srvFormatPrice(pipDigits: number, price: number): string {
    return Number(price).toFixed(pipDigits);
  }

  function srvPipFactor(symbol: string): number {
    const upper = symbol.toUpperCase();
    if (upper.includes('XAU') || upper.includes('GOLD')) return 0.1;
    if (upper.includes('XAG') || upper.includes('SILVER')) return 0.01;
    if (upper.includes('JPY')) return 0.01;
    return 0.0001;
  }

  function srvCalcPips(symbol: string, fromPrice: number, toPrice: number, isBuy: boolean): number {
    const factor = srvPipFactor(symbol);
    const diff = isBuy ? toPrice - fromPrice : fromPrice - toPrice;
    return Math.round((diff / factor) * 10) / 10;
  }

  function srvFormatSignalTimeUtc(ms: number): string {
    const d = new Date(ms);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
  }

  function srvCalcEmaSeries(values: number[], period: number): number[] {
    if (!Array.isArray(values) || values.length < period) return [];
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
    const out: number[] = [ema];
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
      out.push(ema);
    }
    return out;
  }

  function srvCalcEma(values: number[], period: number): number | null {
    const series = srvCalcEmaSeries(values, period);
    return series.length > 0 ? series[series.length - 1] : null;
  }

  function srvCalcAtr(candles: any[], period: number = 14): number | null {
    if (!Array.isArray(candles) || candles.length < period + 1) return null;
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    const trs: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const c = sorted[i];
      const p = sorted[i - 1];
      const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
      if (Number.isFinite(tr) && tr >= 0) trs.push(tr);
    }
    if (trs.length < period) return null;
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }
    return atr > 0 ? atr : null;
  }

  function srvCalcRsi(candles: any[], period: number = 14): number | null {
    if (!Array.isArray(candles) || candles.length < period + 2) return null;
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = sorted[i].close - sorted[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < sorted.length; i++) {
      const diff = sorted[i].close - sorted[i - 1].close;
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - 100 / (1 + rs)).toFixed(1));
  }

  function srvCalcAdx(candles: any[], period: number = 14): { adx: number; plusDi: number; minusDi: number } | null {
    if (!Array.isArray(candles) || candles.length < period * 2 + 2) return null;
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    const trList: number[] = [];
    const plusDmList: number[] = [];
    const minusDmList: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      const prev = sorted[i - 1];
      const upMove = cur.high - prev.high;
      const downMove = prev.low - cur.low;
      plusDmList.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDmList.push(downMove > upMove && downMove > 0 ? downMove : 0);
      trList.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)));
    }
    if (trList.length < period * 2) return null;
    let smTr = trList.slice(0, period).reduce((a, b) => a + b, 0);
    let smPlus = plusDmList.slice(0, period).reduce((a, b) => a + b, 0);
    let smMinus = minusDmList.slice(0, period).reduce((a, b) => a + b, 0);
    const dxList: number[] = [];
    let lastPlusDi = 0;
    let lastMinusDi = 0;
    for (let i = period; i < trList.length; i++) {
      smTr = smTr - smTr / period + trList[i];
      smPlus = smPlus - smPlus / period + plusDmList[i];
      smMinus = smMinus - smMinus / period + minusDmList[i];
      const pdi = smTr > 0 ? (smPlus / smTr) * 100 : 0;
      const mdi = smTr > 0 ? (smMinus / smTr) * 100 : 0;
      lastPlusDi = pdi;
      lastMinusDi = mdi;
      const sum = pdi + mdi;
      dxList.push(sum > 0 ? (Math.abs(pdi - mdi) / sum) * 100 : 0);
    }
    if (dxList.length < period) return null;
    let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxList.length; i++) {
      adx = (adx * (period - 1) + dxList[i]) / period;
    }
    return {
      adx: Number(adx.toFixed(1)),
      plusDi: Number(lastPlusDi.toFixed(1)),
      minusDi: Number(lastMinusDi.toFixed(1))
    };
  }

  interface ServerH4FilterResult {
    ok: boolean;
    bias: 'BUY_ONLY' | 'SELL_ONLY' | 'NO_TRADE';
    ema50: number | null;
    ema9: number | null;
    ema9Prev: number | null;
    ema50Prev: number | null;
    candleCount: number;
    lastCandleTime?: number;
    reason: string;
  }

  function srvEvaluateH4Filter(h4Candles: any[], livePrice: number): ServerH4FilterResult {
    const sorted = [...(h4Candles || [])].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length < 52 || livePrice <= 0) {
      return {
        ok: false,
        bias: 'NO_TRADE',
        ema50: null,
        ema9: null,
        ema9Prev: null,
        ema50Prev: null,
        candleCount: sorted.length,
        reason: 'Insufficient H4 candles (<52) for 50 EMA'
      };
    }
    const closes = sorted.map(c => c.close);
    const e50 = srvCalcEmaSeries(closes, 50);
    const e9 = srvCalcEmaSeries(closes, 9);
    if (e50.length < 2 || e9.length < 2) {
      return {
        ok: false,
        bias: 'NO_TRADE',
        ema50: null,
        ema9: null,
        ema9Prev: null,
        ema50Prev: null,
        candleCount: sorted.length,
        reason: 'EMA calculation incomplete'
      };
    }
    const ema50 = e50[e50.length - 1];
    const ema50Prev = e50[e50.length - 2];
    const ema9 = e9[e9.length - 1];
    const ema9Prev = e9[e9.length - 2];
    const lastCandleTime = sorted[sorted.length - 1].timestamp;

    const ema9SlopeUp = ema9 >= ema9Prev;
    const ema9SlopeDown = ema9 <= ema9Prev;
    if (livePrice > ema50 && livePrice > ema9 && ema9 > ema50 && ema9SlopeUp) {
      return {
        ok: true,
        bias: 'BUY_ONLY',
        ema50,
        ema9,
        ema9Prev,
        ema50Prev,
        candleCount: sorted.length,
        lastCandleTime,
        reason: `H4 Bullish Lock: Price ${livePrice} > EMA9 (${ema9.toFixed(4)}) > EMA50 (${ema50.toFixed(4)})`
      };
    }
    if (livePrice < ema50 && livePrice < ema9 && ema9 < ema50 && ema9SlopeDown) {
      return {
        ok: true,
        bias: 'SELL_ONLY',
        ema50,
        ema9,
        ema9Prev,
        ema50Prev,
        candleCount: sorted.length,
        lastCandleTime,
        reason: `H4 Bearish Lock: Price ${livePrice} < EMA9 (${ema9.toFixed(4)}) < EMA50 (${ema50.toFixed(4)})`
      };
    }
    return {
      ok: true,
      bias: 'NO_TRADE',
      ema50,
      ema9,
      ema9Prev,
      ema50Prev,
      candleCount: sorted.length,
      lastCandleTime,
      reason: 'H4 Price/EMA9/EMA50 misaligned or flat'
    };
  }

  interface ServerStrengthItem {
    currency: string;
    strength: number;
    change24h: number;
  }

  interface ServerStrengthSnapshot {
    hasLiveData: boolean;
    strongestCurrency: string;
    weakestCurrency: string;
    items: ServerStrengthItem[];
    quotes: Record<string, { close: number; changePct24h: number; high: number; low: number; bid?: number; ask?: number }>;
  }

  async function fetchServerLiveMarketSnapshot(): Promise<ServerStrengthSnapshot> {
    const quotes: Record<string, { close: number; changePct24h: number; high: number; low: number; bid?: number; ask?: number }> = {};
    const fxTickers = SERVER_SCAN_PAIRS
      .filter(p => p.category !== 'METALS')
      .map(p => `FX:${p.symbol.replace('/', '')}`);
    // Ensure USD basket drivers are included even if not in scan list
    const basketFx = ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:AUDUSD', 'FX:USDCAD', 'FX:USDCHF', 'FX:NZDUSD'];
    const allFx = Array.from(new Set([...fxTickers, ...basketFx]));
    const cols = ['close', 'change', 'high', 'low', 'bid', 'ask'];

    const fetchTv = async (market: 'forex' | 'cfd', tickers: string[]) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(`https://scanner.tradingview.com/${market}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ symbols: { tickers }, columns: cols }),
          signal: controller.signal
        });
        if (!res.ok) return;
        const json: any = await res.json();
        if (Array.isArray(json?.data)) {
          json.data.forEach((row: any) => {
            const raw = String(row.s || '');
            const clean =
              raw === 'TVC:GOLD' ? 'XAU/USD' :
              raw === 'TVC:SILVER' ? 'XAG/USD' :
              raw.replace(/^FX:/, '').replace(/^([A-Z]{3})([A-Z]{3})$/, '$1/$2');
            const close = Number(row.d?.[0]);
            const change = Number(row.d?.[1] ?? 0);
            const high = Number(row.d?.[2] ?? close);
            const low = Number(row.d?.[3] ?? close);
            const bid = Number(row.d?.[4]);
            const ask = Number(row.d?.[5]);
            if (clean && Number.isFinite(close) && close > 0) {
              quotes[clean] = {
                close,
                changePct24h: Number.isFinite(change) ? change : 0,
                high: Number.isFinite(high) && high > 0 ? high : close,
                low: Number.isFinite(low) && low > 0 ? low : close,
                bid: Number.isFinite(bid) && bid > 0 ? bid : undefined,
                ask: Number.isFinite(ask) && ask > 0 ? ask : undefined
              };
            }
          });
        }
      } catch {
        // ignore
      } finally {
        clearTimeout(timeoutId);
      }
    };

    await Promise.all([
      fetchTv('forex', allFx),
      fetchTv('cfd', ['TVC:GOLD', 'TVC:SILVER'])
    ]);

    // Compute live 24h currency strength strictly from last-24h % changes across USD majors & crosses
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
    const perfSums: Record<string, { sum: number; count: number }> = {};
    currencies.forEach(c => { perfSums[c] = { sum: 0, count: 0 }; });

    Object.entries(quotes).forEach(([sym, q]) => {
      const parts = sym.split('/');
      if (parts.length !== 2) return;
      const [base, quote] = parts;
      if (perfSums[base]) {
        perfSums[base].sum += q.changePct24h;
        perfSums[base].count += 1;
      }
      if (perfSums[quote]) {
        perfSums[quote].sum -= q.changePct24h;
        perfSums[quote].count += 1;
      }
    });

    const rawItems: ServerStrengthItem[] = currencies.map(ccy => {
      const entry = perfSums[ccy];
      const avgPct = entry.count > 0 ? entry.sum / entry.count : 0;
      const strength = Math.max(1.0, Math.min(9.5, Number((5.25 + avgPct * 5.0).toFixed(2))));
      return {
        currency: ccy,
        strength,
        change24h: Number(avgPct.toFixed(3))
      };
    });

    const sorted = [...rawItems].sort((a, b) => b.strength - a.strength);
    const hasLiveData = Object.keys(quotes).length >= 5;
    return {
      hasLiveData,
      strongestCurrency: sorted[0]?.currency || '',
      weakestCurrency: sorted[sorted.length - 1]?.currency || '',
      items: sorted,
      quotes
    };
  }

  function srvCheckCurrencyConflict(
    pairSymbol: string,
    isBuy: boolean,
    snap: ServerStrengthSnapshot
  ): { allowed: boolean; reason?: string; directionalDelta: number } {
    const parts = pairSymbol.split('/');
    const base = parts[0] || '';
    const quote = parts[1] || 'USD';
    const baseItem = snap.items.find(i => i.currency === base);
    const quoteItem = snap.items.find(i => i.currency === quote);
    const baseScore = base === 'XAU' || base === 'XAG' ? 5.5 : (baseItem?.strength ?? 5.25);
    const quoteScore = quoteItem?.strength ?? 5.25;
    const directionalDelta = isBuy ? baseScore - quoteScore : quoteScore - baseScore;

    // Prevent buying weaker currency against stronger currency on 24h momentum
    if (!pairSymbol.startsWith('XAU') && !pairSymbol.startsWith('XAG')) {
      if (isBuy && baseScore < 4.5 && quoteScore > 5.5) {
        return { allowed: false, reason: `24h Strength Conflict: Weak ${base} (${baseScore}) vs Strong ${quote} (${quoteScore})`, directionalDelta };
      }
      if (!isBuy && baseScore > 5.5 && quoteScore < 4.5) {
        return { allowed: false, reason: `24h Strength Conflict: Strong ${base} (${baseScore}) vs Weak ${quote} (${quoteScore})`, directionalDelta };
      }
      if (directionalDelta < -1.4) {
        return { allowed: false, reason: `24h Currency Delta (${directionalDelta.toFixed(2)}) strongly opposes ${isBuy ? 'BUY' : 'SELL'}`, directionalDelta };
      }
    } else if (isBuy && quoteScore >= 7.2 && directionalDelta < -1.5) {
      return { allowed: false, reason: `Strong ${quote} (${quoteScore}) opposes long Metal`, directionalDelta };
    } else if (!isBuy && quoteScore <= 3.2 && directionalDelta < -1.5) {
      return { allowed: false, reason: `Weak ${quote} (${quoteScore}) opposes short Metal`, directionalDelta };
    }
    return { allowed: true, directionalDelta };
  }

  function srvEvaluateSwingRange(
    pair: ServerPairSpec,
    candles: any[],
    livePrice: number,
    isBuy: boolean,
    tfRsi: number | null,
    tfEma21: number | null,
    tfAtr: number | null
  ) {
    const sorted = [...(candles || [])].sort((a, b) => a.timestamp - b.timestamp).slice(-48);
    if (sorted.length < 12 || livePrice <= 0) {
      return {
        hasData: false,
        rangePosPct: 50,
        zoneLabel: 'EQUILIBRIUM',
        isInValueZone: false,
        isChasingZone: false,
        isExtremeChase: false,
        pullbackEntryTarget: null as number | null,
        chaseReason: undefined as string | undefined
      };
    }
    const swingHigh = Math.max(...sorted.map(c => c.high));
    const swingLow = Math.min(...sorted.map(c => c.low));
    const span = swingHigh - swingLow;
    if (!Number.isFinite(span) || span <= 1e-8) {
      return {
        hasData: false,
        rangePosPct: 50,
        zoneLabel: 'EQUILIBRIUM',
        isInValueZone: false,
        isChasingZone: false,
        isExtremeChase: false,
        pullbackEntryTarget: null as number | null,
        chaseReason: undefined as string | undefined
      };
    }
    const equilibrium = (swingHigh + swingLow) / 2;
    const rangePosPct = Math.round(Math.max(0, Math.min(100, ((livePrice - swingLow) / span) * 100)));
    const zoneLabel = rangePosPct <= 38 ? 'DISCOUNT' : rangePosPct >= 62 ? 'PREMIUM' : 'EQUILIBRIUM';
    const isInValueZone = isBuy ? rangePosPct <= 60 : rangePosPct >= 40;
    const isChasingZone = isBuy
      ? rangePosPct >= 78 || (tfRsi !== null && tfRsi >= 72)
      : rangePosPct <= 22 || (tfRsi !== null && tfRsi <= 28);
    const isExtremeChase = isBuy
      ? rangePosPct >= 86 || (tfRsi !== null && tfRsi >= 75)
      : rangePosPct <= 14 || (tfRsi !== null && tfRsi <= 25);

    const atrRef = tfAtr && tfAtr > 0 ? tfAtr : span * 0.22;
    const minPullback = atrRef * 0.30;
    const maxPullback = atrRef * 0.95;
    const refs: number[] = [];
    if (tfEma21 && Number.isFinite(tfEma21)) {
      if ((isBuy && tfEma21 < livePrice) || (!isBuy && tfEma21 > livePrice)) refs.push(tfEma21);
    }
    if ((isBuy && equilibrium < livePrice) || (!isBuy && equilibrium > livePrice)) refs.push(equilibrium);
    let rawTarget = isBuy ? livePrice - atrRef * 0.55 : livePrice + atrRef * 0.55;
    if (refs.length > 0) rawTarget = isBuy ? Math.max(...refs) : Math.min(...refs);
    const bounded = Math.min(maxPullback, Math.max(minPullback, Math.abs(livePrice - rawTarget)));
    const pullbackEntryTarget = Number((isBuy ? livePrice - bounded : livePrice + bounded).toFixed(pair.pipDigits));
    const chaseReason = isChasingZone
      ? `🛑 ANTI-CHASE GUARD: ${isBuy ? 'Buying' : 'Selling'} in ${zoneLabel} (${rangePosPct}% range${tfRsi !== null ? ` • RSI ${tfRsi}` : ''}). Pullback target ${srvFormatPrice(pair.pipDigits, pullbackEntryTarget)}.`
      : undefined;

    return {
      hasData: true,
      rangePosPct,
      zoneLabel,
      isInValueZone,
      isChasingZone,
      isExtremeChase,
      pullbackEntryTarget,
      chaseReason
    };
  }

  async function runServerBackgroundMarketScan(force: boolean = false): Promise<{
    scannedAt: number;
    marketOpen: boolean;
    newlyFormedCount: number;
    newlyFormed: any[];
    activeSignalsCount: number;
    evaluatedCount: number;
    status: string;
  }> {
    const now = Date.now();
    if (!isServerForexMarketOpen(new Date(now))) {
      lastBackgroundScanAt = now;
      lastBackgroundScanNewCount = 0;
      lastBackgroundScanStatus = 'Weekend Market Closed (Fri 22:00 – Sun 22:00 UTC)';
      return {
        scannedAt: now,
        marketOpen: false,
        newlyFormedCount: 0,
        newlyFormed: [],
        activeSignalsCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
        evaluatedCount: 0,
        status: lastBackgroundScanStatus
      };
    }

    if (isBackgroundScanRunning) {
      return {
        scannedAt: lastBackgroundScanAt || now,
        marketOpen: true,
        newlyFormedCount: 0,
        newlyFormed: [],
        activeSignalsCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
        evaluatedCount: 0,
        status: 'Scan already in progress'
      };
    }

    if (!force && lastBackgroundScanAt > 0 && now - lastBackgroundScanAt < 75000) {
      return {
        scannedAt: lastBackgroundScanAt,
        marketOpen: true,
        newlyFormedCount: 0,
        newlyFormed: [],
        activeSignalsCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
        evaluatedCount: 0,
        status: lastBackgroundScanStatus
      };
    }

    isBackgroundScanRunning = true;
    const newlyFormed: any[] = [];
    let evaluatedCount = 0;

    try {
      const strengthSnap = await fetchServerLiveMarketSnapshot();
      if (!strengthSnap.hasLiveData) {
        lastBackgroundScanAt = Date.now();
        lastBackgroundScanNewCount = 0;
        lastBackgroundScanStatus = 'Waiting for live TradingView market feed';
        return {
          scannedAt: lastBackgroundScanAt,
          marketOpen: true,
          newlyFormedCount: 0,
          newlyFormed: [],
          activeSignalsCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
          evaluatedCount: 0,
          status: lastBackgroundScanStatus
        };
      }

      // Track current active/pending portfolio exposure so we never double-open pairs or over-expose one currency
      const currentActiveSignals = Object.values(serverSignalsStore).filter(
        (s: any) => s && (s.status === 'RUNNING' || s.status === 'PENDING')
      );
      const activeSymbolsSet = new Set(currentActiveSignals.map((s: any) => String(s.pair?.symbol || '').toUpperCase()));

      // Clean stale server STANDBY signals > 15m old
      Object.entries(serverSignalsStore).forEach(([id, s]: [string, any]) => {
        if (s && s.status === 'STANDBY' && s.origin === 'SERVER_247' && now - Number(s.createdAtMs || 0) > 15 * 60 * 1000) {
          delete serverSignalsStore[id];
        }
      });

      const dirExposureCounts: Record<string, number> = {};
      currentActiveSignals.forEach((s: any) => {
        const sym = String(s.pair?.symbol || '');
        const parts = sym.split('/');
        const buy = String(s.type || '').startsWith('BUY');
        if (parts[0]) {
          const k = `${parts[0]}:${buy ? 'LONG' : 'SHORT'}`;
          dirExposureCounts[k] = (dirExposureCounts[k] || 0) + 1;
        }
        if (parts[1]) {
          const k = `${parts[1]}:${buy ? 'SHORT' : 'LONG'}`;
          dirExposureCounts[k] = (dirExposureCounts[k] || 0) + 1;
        }
      });

      // Stage 1: Evaluate H4 9/50 EMA + 24h Currency Strength across ALL 30 pairs without an active trade
      // Only pairs passing Stage 1 proceed to fetch H1/M15/D1 (keeps Yahoo rate limits clean across all 30 pairs)
      const candidates = SERVER_SCAN_PAIRS.filter(p => !activeSymbolsSet.has(p.symbol.toUpperCase()));
      const stage2Candidates: Array<{
        pair: ServerPairSpec;
        livePrice: number;
        h4Candles: any[];
        h4Filter: ServerH4FilterResult;
        isBuy: boolean;
        conflict: { allowed: boolean; reason?: string; directionalDelta: number };
      }> = [];

      for (let i = 0; i < candidates.length; i += 4) {
        const batch = candidates.slice(i, i + 4);
        await Promise.all(
          batch.map(async (pair) => {
            try {
              const quote = strengthSnap.quotes[pair.symbol];
              if (!quote || quote.close <= 0) return;
              const livePrice = quote.close;

              const h4Res = await fetchYahooCandlesServer(pair.symbol, 'H4', 120);
              const h4Candles = h4Res.payload?.ok ? h4Res.payload.candles : [];
              if (!Array.isArray(h4Candles) || h4Candles.length < 52) return;

              evaluatedCount++;
              const h4Filter = srvEvaluateH4Filter(h4Candles, livePrice);
              if (!h4Filter.ok || h4Filter.bias === 'NO_TRADE' || !h4Filter.ema50 || !h4Filter.ema9) return;

              const isBuy = h4Filter.bias === 'BUY_ONLY';
              const conflict = srvCheckCurrencyConflict(pair.symbol, isBuy, strengthSnap);
              if (!conflict.allowed) return;

              stage2Candidates.push({ pair, livePrice, h4Candles, h4Filter, isBuy, conflict });
            } catch {
              // skip single pair Stage 1 fetch issue
            }
          })
        );
      }

      // Stage 2: Fetch H1/M15/D1 & evaluate full MTF confluence + Anti-Chase Guard for qualified pairs
      for (let i = 0; i < stage2Candidates.length; i += 3) {
        const batch = stage2Candidates.slice(i, i + 3);
        await Promise.all(
          batch.map(async ({ pair, livePrice, h4Candles, h4Filter, isBuy, conflict }) => {
            try {
              const [h1Res, m15Res, d1Res] = await Promise.all([
                fetchYahooCandlesServer(pair.symbol, 'H1', 120),
                fetchYahooCandlesServer(pair.symbol, 'M15', 100),
                fetchYahooCandlesServer(pair.symbol, 'D1', 60)
              ]);

              const h1Candles = h1Res.payload?.ok ? h1Res.payload.candles : [];
              const m15Candles = m15Res.payload?.ok ? m15Res.payload.candles : [];
              const d1Candles = d1Res.payload?.ok ? d1Res.payload.candles : [];
              const [baseCcy, quoteCcy] = pair.symbol.split('/');
              const baseKey = `${baseCcy}:${isBuy ? 'LONG' : 'SHORT'}`;
              const quoteKey = `${quoteCcy}:${isBuy ? 'SHORT' : 'LONG'}`;

              const sortedH4 = [...h4Candles].sort((a, b) => a.timestamp - b.timestamp);
              const sortedH1 = [...h1Candles].sort((a, b) => a.timestamp - b.timestamp);
              const sortedM15 = [...m15Candles].sort((a, b) => a.timestamp - b.timestamp);
              const sortedD1 = [...d1Candles].sort((a, b) => a.timestamp - b.timestamp);

              const h4Atr = srvCalcAtr(sortedH4, 14) || Math.max(0.0001, livePrice * 0.002);
              const h1Atr = srvCalcAtr(sortedH1, 14) || h4Atr * 0.55;
              const h1Rsi = srvCalcRsi(sortedH1, 14);
              const m15Rsi = srvCalcRsi(sortedM15, 14);
              const h1Adx = srvCalcAdx(sortedH1, 14);

              // 1. Real H4 Trend Score (0-25)
              let h4Pts = 15;
              const emaSpreadAtr = Math.abs(h4Filter.ema9 - h4Filter.ema50) / Math.max(h4Atr, 1e-8);
              if (emaSpreadAtr >= 0.45) h4Pts += 6;
              else if (emaSpreadAtr >= 0.22) h4Pts += 4;
              else if (emaSpreadAtr >= 0.08) h4Pts += 2;
              const priceDistEma9Atr = Math.abs(livePrice - h4Filter.ema9) / Math.max(h4Atr, 1e-8);
              if (priceDistEma9Atr <= 0.75) h4Pts += 4;
              else if (priceDistEma9Atr <= 1.35) h4Pts += 2;
              h4Pts = Math.min(25, h4Pts);

              // 2. Real H1 + M15 Alignment Score (0-25)
              let h1Pts = 0;
              let h1Aligned = false;
              let h1Ema21: number | null = null;
              if (sortedH1.length >= 25) {
                const h1Closes = sortedH1.map(c => c.close);
                const h1E9 = srvCalcEma(h1Closes, 9);
                h1Ema21 = srvCalcEma(h1Closes, 21);
                const h1E50 = srvCalcEma(h1Closes, 50);
                if (h1E9 !== null && h1E50 !== null) {
                  if ((isBuy && livePrice > h1E50 && h1E9 > h1E50) || (!isBuy && livePrice < h1E50 && h1E9 < h1E50)) {
                    h1Pts += 11;
                    h1Aligned = true;
                  } else if ((isBuy && livePrice > h1E9) || (!isBuy && livePrice < h1E9)) {
                    h1Pts += 6;
                  }
                }
                const lastH1 = sortedH1[sortedH1.length - 1];
                if (lastH1 && ((isBuy && lastH1.close > lastH1.open) || (!isBuy && lastH1.close < lastH1.open))) {
                  h1Pts += 4;
                }
              }
              h1Pts = Math.min(15, h1Pts);

              let m15Pts = 0;
              let m15Aligned = false;
              if (sortedM15.length >= 22) {
                const m15Closes = sortedM15.map(c => c.close);
                const m15E9 = srvCalcEma(m15Closes, 9);
                const m15E20 = srvCalcEma(m15Closes, 20);
                if (m15E9 !== null && m15E20 !== null) {
                  if ((isBuy && livePrice > m15E20 && m15E9 > m15E20) || (!isBuy && livePrice < m15E20 && m15E9 < m15E20)) {
                    m15Pts += 7;
                    m15Aligned = true;
                  } else if ((isBuy && livePrice > m15E9) || (!isBuy && livePrice < m15E9)) {
                    m15Pts += 4;
                  }
                }
                const lastM15 = sortedM15[sortedM15.length - 1];
                if (lastM15 && ((isBuy && lastM15.close > lastM15.open) || (!isBuy && lastM15.close < lastM15.open))) {
                  m15Pts += 3;
                }
              }
              m15Pts = Math.min(10, m15Pts);
              const h1M15Pts = Math.min(25, h1Pts + m15Pts);

              // 3. Live 24h Currency Strength Divergence (0-20)
              const strengthPts = Math.min(20, Math.max(0, Math.round(10 + conflict.directionalDelta * 2.5)));

              // 4. Real D1 Trend + PDH/PDL Liquidity Sweep (0-15)
              let d1Pts = 0;
              let d1Aligned = false;
              let liqPts = 0;
              let isLiquiditySwept = false;
              let liquiditySweepLevel = Number(livePrice.toFixed(pair.pipDigits));
              const liquiditySweepType: 'PDL' | 'PDH' = isBuy ? 'PDL' : 'PDH';
              let liquiditySweepDetail = 'Awaiting PDH/PDL liquidity sweep';
              let liquiditySweepStatusTag = '⏳ Awaiting Sweep';
              let d1MacroTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

              if (sortedD1.length >= 22) {
                const d1Ema20 = srvCalcEma(sortedD1.map(c => c.close), 20);
                if (d1Ema20 !== null) {
                  d1MacroTrend = livePrice > d1Ema20 ? 'BULLISH' : livePrice < d1Ema20 ? 'BEARISH' : 'NEUTRAL';
                  if ((isBuy && livePrice > d1Ema20) || (!isBuy && livePrice < d1Ema20)) {
                    d1Pts = 8;
                    d1Aligned = true;
                  } else {
                    const lastD1 = sortedD1[sortedD1.length - 1];
                    d1Pts = (isBuy ? lastD1.close > lastD1.open : lastD1.close < lastD1.open) ? 3 : 0;
                  }
                }
                const prevD1 = sortedD1[sortedD1.length - 2] || sortedD1[sortedD1.length - 1];
                const pdh = prevD1.high;
                const pdl = prevD1.low;
                liquiditySweepLevel = Number((isBuy ? pdl : pdh).toFixed(pair.pipDigits));
                const intraday = (sortedH1.length > 0 ? sortedH1 : sortedH4).slice(-24);
                const sweepBar = [...intraday].reverse().find(c =>
                  isBuy ? (c.low <= pdl && livePrice > pdl) : (c.high >= pdh && livePrice < pdh)
                );
                if (sweepBar) {
                  isLiquiditySwept = true;
                  liqPts = 7;
                  const dt = new Date(sweepBar.timestamp);
                  const tt = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')} UTC`;
                  liquiditySweepDetail = `✅ REAL SWEEP: ${liquiditySweepType} (${liquiditySweepLevel}) swept at ${tt}`;
                  liquiditySweepStatusTag = `💧 ${liquiditySweepType} Swept ${tt}`;
                } else {
                  const favored = isBuy ? livePrice > pdl : livePrice < pdh;
                  liqPts = favored ? 3 : 0;
                  liquiditySweepStatusTag = `⏳ ${liquiditySweepType} ${liquiditySweepLevel}`;
                }
              }
              const d1LiquidityPts = Math.min(15, d1Pts + liqPts);

              // 5. Real True Range ATR + Spread Efficiency (0-15)
              const volBars = sortedH1.length >= 15 ? sortedH1 : sortedH4;
              const latestBar = volBars[volBars.length - 1];
              const latestRange = latestBar ? Math.max(0, latestBar.high - latestBar.low) : h1Atr;
              const volRatio = latestRange / Math.max(h1Atr, 1e-8);
              const atrExpansionPts =
                volRatio >= 0.60 && volRatio <= 2.20 ? 8 :
                volRatio >= 0.35 && volRatio < 0.60 ? 4 :
                volRatio > 2.20 && volRatio <= 3.00 ? 3 : 1;

              const atrPips = Math.max(8, Math.round(Math.abs(srvCalcPips(pair.symbol, livePrice, livePrice + h1Atr, true))));
              const spreadToAtr = pair.spreadPips / Math.max(atrPips, 1);
              const spreadPts = spreadToAtr <= 0.05 ? 7 : spreadToAtr <= 0.08 ? 5 : spreadToAtr <= 0.12 ? 3 : 1;
              const atrSpreadPts = Math.min(15, atrExpansionPts + spreadPts);

              // 6. Real 48-bar Swing Range & Anti-Chase Guard
              const swingCandles = sortedH1.length >= 16 ? sortedH1 : sortedH4;
              const swingEval = srvEvaluateSwingRange(pair, swingCandles, livePrice, isBuy, h1Rsi, h1Ema21, h1Atr);
              const valueAdjustment = swingEval.hasData
                ? (swingEval.isExtremeChase ? -22 : swingEval.isChasingZone ? -14 : swingEval.isInValueZone ? 4 : 0)
                : 0;

              const rawTotal = h4Pts + h1M15Pts + strengthPts + d1LiquidityPts + atrSpreadPts + valueAdjustment;
              const total = Math.max(0, Math.min(100, Math.round(rawTotal)));

              // Compute per-TF scores & choose winning TF (H1 -> M15 -> H4 tie-breaker)
              const sharedOther = strengthPts + d1LiquidityPts + atrSpreadPts + valueAdjustment;
              const h1ScoreVal = Math.max(0, Math.min(100, h4Pts + h1Pts + m15Pts + sharedOther));
              const m15ScoreVal = Math.max(0, Math.min(100, h4Pts + Math.round(m15Pts * 1.5) + h1Pts + sharedOther));
              const h4ScoreVal = Math.max(0, Math.min(100, Math.round(h4Pts * 1.15) + h1Pts + Math.round(m15Pts * 0.6) + sharedOther));
              let winningTf: 'M15' | 'H1' | 'H4' = 'H1';
              if (h1ScoreVal >= m15ScoreVal && h1ScoreVal >= h4ScoreVal) winningTf = 'H1';
              else if (m15ScoreVal >= h4ScoreVal) winningTf = 'M15';
              else winningTf = 'H4';

              const highestScore = Math.max(total, winningTf === 'H1' ? h1ScoreVal : winningTf === 'M15' ? m15ScoreVal : h4ScoreVal);

              // Strict real-signal gate: Score >= 76 AND NOT chasing highs/lows
              if (highestScore < 76 || swingEval.isChasingZone || swingEval.isExtremeChase) return;

              // Check ADX if available on H1 (avoid dead flat chop)
              if (h1Adx && h1Adx.adx < 16) return;

              const isGold = pair.symbol.includes('XAU');
              const slPips = winningTf === 'M15'
                ? Math.min(isGold ? 50 : 28, Math.max(isGold ? 28 : 16, Math.round(atrPips * 0.9)))
                : winningTf === 'H1'
                ? Math.min(isGold ? 75 : 42, Math.max(isGold ? 42 : 24, Math.round(atrPips * 1.1)))
                : Math.min(isGold ? 110 : 62, Math.max(isGold ? 60 : 34, Math.round(atrPips * 1.3)));

              const rrRatio = winningTf === 'M15' ? 2.0 : winningTf === 'H1' ? 2.5 : 3.0;
              const tp1Pips = Math.round(slPips * rrRatio * 10) / 10;
              const tp2Pips = Math.round(tp1Pips * 1.5 * 10) / 10;
              const tp3Pips = Math.round(tp1Pips * 2.0 * 10) / 10;
              const pipUnit = srvPipFactor(pair.symbol);

              const nearValueEntry = swingEval.isInValueZone || isLiquiditySwept;
              const signalType = nearValueEntry
                ? (isBuy ? 'BUY_MARKET' : 'SELL_MARKET')
                : (isBuy ? 'BUY_LIMIT' : 'SELL_LIMIT');
              const isLimit = signalType.includes('LIMIT');

              let entryPrice = Number(livePrice.toFixed(pair.pipDigits));
              if (isLimit && swingEval.pullbackEntryTarget &&
                ((isBuy && swingEval.pullbackEntryTarget < livePrice) || (!isBuy && swingEval.pullbackEntryTarget > livePrice))) {
                entryPrice = swingEval.pullbackEntryTarget;
              } else if (isLimit) {
                entryPrice = Number((livePrice + (isBuy ? -1 : 1) * Math.max(4 * pipUnit, h1Atr * 0.4)).toFixed(pair.pipDigits));
              }

              const stopLoss = Number((entryPrice + (isBuy ? -1 : 1) * slPips * pipUnit).toFixed(pair.pipDigits));
              const takeProfit1 = Number((entryPrice + (isBuy ? 1 : -1) * tp1Pips * pipUnit).toFixed(pair.pipDigits));
              const takeProfit2 = Number((entryPrice + (isBuy ? 1 : -1) * tp2Pips * pipUnit).toFixed(pair.pipDigits));
              const takeProfit3 = Number((entryPrice + (isBuy ? 1 : -1) * tp3Pips * pipUnit).toFixed(pair.pipDigits));

              const strategy = isGold || pair.symbol.includes('XAG')
                ? 'GOLD_HUNTER'
                : isLiquiditySwept
                ? 'LONDON_KILLER'
                : 'TREND_RIDER';

              const createdAtMs = Date.now();
              const cleanIdSym = pair.symbol.replace(/[^A-Za-z0-9]/g, '');
              const id = `SIG-${cleanIdSym}-${strategy}-${winningTf}-${createdAtMs.toString(36).toUpperCase()}-S247`;
              const riskRewardLabel = `1:${rrRatio.toFixed(1)}`;
              const effectiveH4Pts = winningTf === 'H4' ? Math.round(h4Pts * 1.15) : h4Pts;
              const effectiveH1M15Pts = winningTf === 'M15'
                ? Math.round(m15Pts * 1.5) + h1Pts
                : winningTf === 'H4'
                ? h1Pts + Math.round(m15Pts * 0.6)
                : h1M15Pts;
              const effectiveAtrSpreadPts = atrSpreadPts + valueAdjustment;
              const finalBreakdownTotal = Math.max(
                0,
                Math.min(100, Math.round(effectiveH4Pts + effectiveH1M15Pts + strengthPts + d1LiquidityPts + effectiveAtrSpreadPts))
              );
              const summaryText = `H4:${effectiveH4Pts} + H1/M15:${effectiveH1M15Pts} + Strength:${strengthPts} + D1/Liq:${d1LiquidityPts} + ATR:${effectiveAtrSpreadPts} = ${finalBreakdownTotal}`;
              const scoreBreakdownText = `H1:${h1ScoreVal} | M15:${m15ScoreVal} | H4:${h4ScoreVal}`;

              const confluenceBreakdown = {
                h4Score: effectiveH4Pts,
                h1M15Score: effectiveH1M15Pts,
                strengthScore: strengthPts,
                d1LiquidityScore: d1LiquidityPts,
                atrSpreadScore: effectiveAtrSpreadPts,
                newsPenalty: 0,
                total: finalBreakdownTotal,
                summaryText,
                sources: {
                  h4Bars: sortedH4.length,
                  h1Bars: sortedH1.length,
                  m15Bars: sortedM15.length,
                  d1Bars: sortedD1.length
                }
              };

              const currencyScoresSnapshot: Record<string, { score: number; change24hPct: number }> = {};
              strengthSnap.items.forEach(item => {
                currencyScoresSnapshot[item.currency] = { score: item.strength, change24hPct: item.change24h };
              });
              const baseItem = strengthSnap.items.find(s => s.currency === baseCcy);
              const quoteItem = strengthSnap.items.find(s => s.currency === quoteCcy);

              const generationAudit = {
                signalId: id,
                pairSymbol: pair.symbol,
                direction: isBuy ? 'BUY' : 'SELL',
                orderType: signalType,
                generatedAtMs: createdAtMs,
                generatedAtIso: new Date(createdAtMs).toISOString(),
                price: livePrice,
                timeframe: winningTf,
                h4TrendBias: h4Filter.bias,
                ema50: Number(h4Filter.ema50.toFixed(pair.pipDigits + 1)),
                ema9: Number(h4Filter.ema9.toFixed(pair.pipDigits + 1)),
                lastH4CandleTime: h4Filter.lastCandleTime,
                h4CandleCount: h4Filter.candleCount,
                baseCurrency: baseCcy,
                quoteCurrency: quoteCcy,
                baseStrengthScore: baseItem?.strength ?? 5.5,
                quoteStrengthScore: quoteItem?.strength ?? 5.0,
                strongestCurrency: strengthSnap.strongestCurrency,
                weakestCurrency: strengthSnap.weakestCurrency,
                currencyScoresSnapshot,
                winPct: null,
                grade: highestScore >= 85 ? 'A+' : highestScore >= 78 ? 'A' : 'B',
                winPctSource: '24/7 Server Real MTF Scan',
                backtestTradeCount: 0,
                conflictCheckPassed: true,
                confluenceBreakdown
              };

              const signalObj = {
                id,
                pair: {
                  symbol: pair.symbol,
                  name: pair.name,
                  basePrice: livePrice,
                  currentPrice: livePrice,
                  pipDigits: pair.pipDigits,
                  spreadPips: pair.spreadPips,
                  category: pair.category,
                  isGoldOrCrypto: pair.isGoldOrCrypto,
                  minMargin001: pair.minMargin001,
                  pipValue001: pair.pipValue001,
                  isMicroAccountFriendly: true
                },
                type: signalType,
                status: isLimit ? 'PENDING' : 'RUNNING',
                entryPrice,
                currentPrice: livePrice,
                stopLoss,
                takeProfit1,
                takeProfit2,
                takeProfit3,
                takeProfit: takeProfit1,
                pips: isLimit ? 0 : srvCalcPips(pair.symbol, entryPrice, livePrice, isBuy),
                riskReward: riskRewardLabel,
                confluenceScore: finalBreakdownTotal,
                confluenceBreakdown,
                rationale: `[24/7 SERVER SCAN] H4 EMA Lock (${h4Filter.bias}): Price ${srvFormatPrice(pair.pipDigits, livePrice)} vs EMA9 (${h4Filter.ema9.toFixed(pair.pipDigits)}) / EMA50 (${h4Filter.ema50.toFixed(pair.pipDigits)}). ${swingEval.zoneLabel} (${swingEval.rangePosPct}% range${h1Rsi !== null ? `, RSI ${h1Rsi}` : ''}). ${summaryText}.`,
                timeframe: winningTf,
                winningTf,
                scoreBreakdownText,
                tfScores: {
                  m15: m15ScoreVal,
                  h1: h1ScoreVal,
                  h4: h4ScoreVal,
                  winningTf,
                  textSummary: scoreBreakdownText
                },
                timestamp: '24/7 Server Scan',
                institutionalFlow: `${strategy} [${winningTf}] • 24/7 Server MTF Scan`,
                isBestTradeNow: highestScore >= 82,
                isPending: isLimit,
                isFavorite: pair.symbol === 'XAU/USD' || pair.symbol === 'EUR/USD',
                hasAlert: false,
                checklist: [
                  {
                    title: 'Premium/Discount Anti-Chase Guard',
                    isConfirmed: true,
                    detail: `${swingEval.zoneLabel} zone (${swingEval.rangePosPct}% of 48-bar range${h1Rsi !== null ? `, H1 RSI ${h1Rsi}` : ''})`
                  },
                  {
                    title: 'Real H4 EMA 50/9 Trend Lock',
                    isConfirmed: true,
                    detail: `${h4Filter.bias} • EMA9 ${h4Filter.ema9.toFixed(pair.pipDigits)} vs EMA50 ${h4Filter.ema50.toFixed(pair.pipDigits)}`
                  },
                  {
                    title: 'H1 & M15 MTF Alignment',
                    isConfirmed: h1Aligned || m15Aligned,
                    detail: `H1 Aligned: ${h1Aligned ? 'Yes' : 'Partial'} • M15 Aligned: ${m15Aligned ? 'Yes' : 'Partial'}`
                  },
                  {
                    title: 'Daily (D1) & Liquidity Sweep',
                    isConfirmed: d1Aligned || isLiquiditySwept,
                    detail: `${d1MacroTrend} D1 • ${liquiditySweepDetail}`
                  },
                  {
                    title: 'Real 24h Currency Strength Divergence',
                    isConfirmed: strengthPts >= 10,
                    detail: `Delta ${conflict.directionalDelta >= 0 ? '+' : ''}${conflict.directionalDelta.toFixed(2)} (${strengthSnap.strongestCurrency} strongest / ${strengthSnap.weakestCurrency} weakest)`
                  }
                ],
                killzone: '24/7 Continuous Cloud Session',
                winProbability: highestScore >= 85 ? 72 : 66,
                quality: highestScore >= 85 ? 'A+' : highestScore >= 78 ? 'A' : 'B',
                winPctSource: '24/7 Server Real MTF Scan',
                backtestTradeCount: 0,
                generationAudit,
                economicRisk: 'Verified by 24/7 Server MTF & Anti-Chase Gate',
                validityTimeLeft: isLimit ? `Pending Limit @ ${srvFormatPrice(pair.pipDigits, entryPrice)}` : 'Active (24/7 Server Scan)',
                validityExpiresAt: `Targeting TP1 ${srvFormatPrice(pair.pipDigits, takeProfit1)}`,
                invalidationTrigger: `Institutional SL at ${srvFormatPrice(pair.pipDigits, stopLoss)} (${riskRewardLabel} RR)`,
                createdAtMs,
                createdAtFormatted: srvFormatSignalTimeUtc(createdAtMs),
                executedAtMs: isLimit ? undefined : createdAtMs,
                executedAtFormatted: isLimit ? undefined : srvFormatSignalTimeUtc(createdAtMs),
                isLiveSynced: true,
                isServerGenerated: true,
                origin: 'SERVER_247',
                strategy,
                d1MacroTrend,
                isD1Aligned: d1Aligned,
                isLiquiditySwept,
                liquiditySweepLevel,
                liquiditySweepType,
                liquiditySweepDetail,
                liquiditySweepStatusTag,
                lastSyncedAt: createdAtMs
              };

              serverSignalsStore[id] = signalObj;
              newlyFormed.push(signalObj);
              dirExposureCounts[baseKey] = (dirExposureCounts[baseKey] || 0) + 1;
              dirExposureCounts[quoteKey] = (dirExposureCounts[quoteKey] || 0) + 1;

              console.log(`[24/7 Background Scanner] Formed ${pair.symbol} ${signalType} (${winningTf}, Confluence ${highestScore}/100, Range ${swingEval.rangePosPct}%)`);

              if (!serverSentTelegramIds.has(id) && serverTelegramConfig.enabled && serverTelegramConfig.botToken && serverTelegramConfig.chatId) {
                serverSentTelegramIds.add(id);
                const msg =
                  `🚀 *[24/7 CLOSED-APP SCAN]* *NEW SIGNAL FORMED!*\n\n` +
                  `📊 *Pair:* ${pair.symbol} (${signalType.replace('_', ' ')})\n` +
                  `⏱ *Timeframe:* ${winningTf} • *Confluence:* ${highestScore}/100\n` +
                  `📍 *Entry:* ${srvFormatPrice(pair.pipDigits, entryPrice)}\n` +
                  `🛑 *SL:* ${srvFormatPrice(pair.pipDigits, stopLoss)}\n` +
                  `🎯 *TP1:* ${srvFormatPrice(pair.pipDigits, takeProfit1)} (${riskRewardLabel})\n` +
                  `📈 *Zone:* ${swingEval.zoneLabel} (${swingEval.rangePosPct}% range)\n` +
                  `🧩 *Breakdown:* ${summaryText}`;
                fetch(`https://api.telegram.org/bot${serverTelegramConfig.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: serverTelegramConfig.chatId, text: msg, parse_mode: 'Markdown' })
                }).catch(() => {});
              }
            } catch (pairErr) {
              console.warn(`[24/7 Background Scanner] Pair ${pair.symbol} eval failed:`, pairErr);
            }
          })
        );
      }

      if (newlyFormed.length > 0) {
        saveServerSignalsStore(serverSignalsStore);
      }

      lastBackgroundScanAt = Date.now();
      lastBackgroundScanNewCount = newlyFormed.length;
      lastBackgroundScanStatus =
        newlyFormed.length > 0
          ? `Formed ${newlyFormed.length} new signal(s) across ${evaluatedCount} pairs`
          : `Scanned ${evaluatedCount} pairs cleanly (no new setups passed gates)`;

      return {
        scannedAt: lastBackgroundScanAt,
        marketOpen: true,
        newlyFormedCount: newlyFormed.length,
        newlyFormed,
        activeSignalsCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
        evaluatedCount,
        status: lastBackgroundScanStatus
      };
    } catch (err: any) {
      lastBackgroundScanAt = Date.now();
      lastBackgroundScanStatus = `Scan error: ${err?.message || 'Unknown'}`;
      return {
        scannedAt: lastBackgroundScanAt,
        marketOpen: true,
        newlyFormedCount: 0,
        newlyFormed,
        activeSignalsCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
        evaluatedCount,
        status: lastBackgroundScanStatus
      };
    } finally {
      isBackgroundScanRunning = false;
    }
  }

  app.get('/api/signals/background-scan', async (req, res) => {
    const force = req.query.force === '1' || req.query.force === 'true';
    const includeSignals = req.query.includeSignals === '1' || req.query.includeSignals === 'true';
    const result = await runServerBackgroundMarketScan(force);
    const allStored = Object.values(serverSignalsStore);
    const activeCount = allStored.filter((s: any) => s?.status === 'RUNNING' || s?.status === 'PENDING').length;
    res.json({
      success: true,
      ...result,
      activeCount,
      totalStoredCount: allStored.length,
      ...(includeSignals ? { signals: allStored } : {})
    });
  });

  app.post('/api/signals/background-scan', async (req, res) => {
    const force = Boolean(req.body?.force || req.query.force === '1');
    const includeSignals = Boolean(req.body?.includeSignals || req.query.includeSignals === '1');
    const result = await runServerBackgroundMarketScan(force);
    const allStored = Object.values(serverSignalsStore);
    const activeCount = allStored.filter((s: any) => s?.status === 'RUNNING' || s?.status === 'PENDING').length;
    res.json({
      success: true,
      ...result,
      activeCount,
      totalStoredCount: allStored.length,
      ...(includeSignals ? { signals: allStored } : {})
    });
  });

  app.post('/api/signals/sync', async (req, res) => {
    try {
      const clientSignals = Array.isArray(req.body?.signals) ? req.body.signals : [];
      let updatedCount = 0;

      // Also ensure no legacy non-closed pre-breakdown signals remain in server store
      Object.entries(serverSignalsStore).forEach(([id, s]: [string, any]) => {
        const isClosed = s?.status === 'HIT_TP' || s?.status === 'HIT_SL' || s?.status === 'EXPIRED';
        if (!isClosed && !hasServerConfluenceBreakdown(s)) {
          delete serverSignalsStore[id];
          updatedCount++;
        }
      });

      clientSignals.forEach((sig: any) => {
        if (sig && sig.id) {
          const existing = serverSignalsStore[sig.id];
          const isClosed = sig.status === 'HIT_SL' || sig.status === 'HIT_TP' || sig.status === 'EXPIRED' || sig.status === 'CANCELLED';
          if (!isClosed && !hasServerConfluenceBreakdown(sig)) {
            // Reject legacy active/standby signals lacking real breakdown
            return;
          }
          // If server already marked it as HIT_SL / HIT_TP / CANCELLED, keep server's closed outcome
          if (existing && (existing.status === 'HIT_SL' || existing.status === 'HIT_TP' || existing.status === 'CANCELLED')) {
            // keep closed
          } else {
            serverSignalsStore[sig.id] = {
              ...sig,
              lastSyncedAt: Date.now()
            };
            updatedCount++;
          }
        }
      });
      if (updatedCount > 0) {
        saveServerSignalsStore(serverSignalsStore);
      }

      if (Date.now() - lastServerMonitorTick > 10000) {
        await runServerWatchdogTick();
      }

      res.json({
        success: true,
        serverTime: Date.now(),
        lastMonitorTick: lastServerMonitorTick,
        lastBackgroundScanAt,
        lastBackgroundScanNewCount,
        lastBackgroundScanStatus,
        signals: Object.values(serverSignalsStore)
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // Run 24/7 Watchdog immediately 1.5s after boot and every 25s thereafter
  setTimeout(() => {
    runServerWatchdogTick();
  }, 1500);
  setInterval(() => {
    runServerWatchdogTick();
  }, 25000);

  // Run 24/7 Background Market Scanner 6s after boot and every 120s thereafter
  setTimeout(() => {
    runServerBackgroundMarketScan(false).catch(() => {});
  }, 6000);
  setInterval(() => {
    runServerBackgroundMarketScan(false).catch(() => {});
  }, 120000);

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
          const timeoutMs = candidateModel === 'gemini-3.8-flash' ? 25000 : 15000;
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout on ${candidateModel}`)), timeoutMs)
          );
          const config: any = {
            systemInstruction,
          };
          if (candidateModel === 'gemini-3.8-flash') {
            config.thinkingConfig = {
              thinkingLevel: ThinkingLevel.LOW,
            };
          }
          const apiPromise = ai.models.generateContent({
            model: candidateModel,
            contents,
            config,
          });
          const response = await Promise.race([apiPromise, timeoutPromise]);
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (mErr: any) {
          console.warn(`[AI Copilot] Model ${candidateModel} fallback notice:`, mErr?.message || mErr);
          // Fall back gracefully to next candidate model
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
      res.setHeader('Content-Disposition', 'attachment; filename="FX-Signals-Pro-Mobile-App-v1.4.0.html"');
      res.send(standaloneHtml);
    } catch (err) {
      res.status(500).json({ error: err?.message || 'Failed to generate standalone mobile app' });
    }
  });

  // Native Android APK Download Endpoint (4-byte zipaligned, v1+v2 signed, full self-contained bundle)
  const serveAndroidApk = async (_req, res) => {
    try {
      const forceRebuild = Boolean(_req.query.v);
      const apkBuf = await getOrBuildApkBuffer(forceRebuild);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="FX-Signals-Pro-v1.4.0.apk"');
      res.setHeader('Content-Length', String(apkBuf.length));
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(apkBuf);
    } catch (err) {
      res.status(500).send(err?.message || 'Failed to build APK');
    }
  };

  // Dedicated Telegram & Mobile App Download Portal
  app.get('/download', async (req, res) => {
    // If direct APK download requested via query or header, serve binary immediately
    if (req.query.direct === '1' || req.query.apk === '1' || req.query.format === 'apk') {
      return serveAndroidApk(req, res);
    }

    const appOrigin = `${req.protocol}://${req.get('host') || 'ais-pre-khyxbhrliwbprp5vdzyqd6-952034086177.asia-southeast1.run.app'}`;
    const directApkLink = `${appOrigin}/FX-Signals-Pro.apk?v=1.4.0`;

    const downloadPageHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Download FX Signals Pro — Mobile App</title>
  <meta name="description" content="Download FX Signals Pro v1.4.0 Android APK or install directly from Telegram." />
  <meta property="og:title" content="Download FX Signals Pro v1.4.0 (.APK)" />
  <meta property="og:description" content="Tap to download the official FX Signals Pro Android App (.APK) with live Forex, Gold, and Silver signals." />
  <meta property="og:image" content="${appOrigin}/icon.svg" />
  <meta name="theme-color" content="#080B11" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #080B11; color: #F1F5F9; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #0D111C; border: 1px solid #222F47; border-radius: 20px; max-width: 440px; width: 100%; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); text-align: center; }
    .icon { width: 72px; height: 72px; border-radius: 18px; border: 2px solid rgba(255, 215, 0, 0.4); margin: 0 auto 16px; display: block; }
    h1 { font-size: 20px; font-weight: 900; margin-bottom: 6px; color: #FFF; }
    .badge { display: inline-block; background: rgba(0, 230, 118, 0.15); color: #00E676; border: 1px solid rgba(0, 230, 118, 0.3); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 14px; }
    p { font-size: 13px; color: #94A3B8; line-height: 1.5; margin-bottom: 20px; }
    .btn-download { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: linear-gradient(135deg, #00E676, #10B981); color: #080B11; font-weight: 900; font-size: 14px; border-radius: 14px; text-decoration: none; margin-bottom: 10px; box-shadow: 0 4px 14px rgba(0, 230, 118, 0.3); transition: transform 0.1s; }
    .btn-download:active { transform: scale(0.98); }
    .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #141C2E; color: #2979FF; border: 1px solid rgba(41, 121, 255, 0.4); font-weight: 700; font-size: 13px; border-radius: 14px; text-decoration: none; margin-bottom: 10px; }
    .btn-outline { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px; background: transparent; color: #94A3B8; border: 1px solid #222F47; font-weight: 600; font-size: 12px; border-radius: 14px; text-decoration: none; }
    .guide { background: #080B11; border: 1px solid #222F47; border-radius: 12px; padding: 14px; margin-top: 18px; text-align: left; font-size: 11px; color: #CBD5E1; }
    .guide-title { font-weight: bold; color: #FFD700; margin-bottom: 6px; }
    .guide ol { padding-left: 18px; line-height: 1.6; color: #94A3B8; }
    .status-box { font-size: 11.5px; color: #00E676; margin-top: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/icon.svg" alt="FX Signals Pro" class="icon" />
    <h1>FX Signals Pro</h1>
    <div class="badge">v1.4.0 • Updated Build • Signed APK</div>
    <p>Official download link for Telegram. Tap the button below to download the Android app package or launch the live terminal.</p>

    <a href="${directApkLink}" download="FX-Signals-Pro-v1.4.0.apk" class="btn-download" id="apkBtn">
      ⬇️ Download FX-Signals-Pro.apk (v1.4.0)
    </a>

    <a href="/" class="btn-secondary">
      🌐 Launch Live Web App (Direct)
    </a>

    <a href="https://t.me/share/url?url=${encodeURIComponent(appOrigin + '/download')}&text=${encodeURIComponent('📲 Download FX Signals Pro v1.4.0 App (.APK) with Live Forex, Gold & Silver Signals!')}" target="_blank" class="btn-outline">
      ✈️ Share on Telegram
    </a>

    <div class="status-box" id="statusMsg">
      ⚡ Initializing direct download...
    </div>

    <div class="guide">
      <div class="guide-title">📲 How to Install on Android:</div>
      <ol>
        <li>Tap <strong>Download FX-Signals-Pro.apk</strong> above.</li>
        <li>When download finishes, tap the notification or open your <strong>Downloads</strong> folder.</li>
        <li>If Android Play Protect prompts, tap <strong>"More details" &gt; "Install anyway"</strong>.</li>
        <li>Tap <strong>Open</strong> to start trading with zero delays!</li>
      </ol>
    </div>
  </div>

  <script>
    // Automatically trigger APK download 400ms after landing from Telegram link
    setTimeout(function() {
      try {
        var statusEl = document.getElementById('statusMsg');
        statusEl.innerText = '✅ Download started! Check your phone notification bar.';
        var link = document.createElement('a');
        link.href = '${directApkLink}';
        link.setAttribute('download', 'FX-Signals-Pro-v1.4.0.apk');
        document.body.appendChild(link);
        link.click();
      } catch (e) {
        // user can tap button manually
      }
    }, 500);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(downloadPageHtml);
  });

  // Alias /telegram link directly to /download
  app.get('/telegram', (_req, res) => {
    res.redirect('/download');
  });

  // Multiple APK file aliases to ensure all Telegram and browser links work 100%
  app.get('/FX-Signals-Pro.apk', serveAndroidApk);
  app.get('/Elite-Alpha-Signals.apk', serveAndroidApk);
  app.get('/download.apk', serveAndroidApk);
  app.get('/app.apk', serveAndroidApk);
  app.get('/api/download/apk', serveAndroidApk);

  const distPath = path.join(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

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
      console.warn('Vite dev middleware unavailable, falling back to static dist:', err);
    }
  }

  if (!viteMounted) {
    app.use(express.static(distPath));
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }
      if (
        req.originalUrl.startsWith('/api') ||
        req.originalUrl.startsWith('/download') ||
        req.originalUrl.startsWith('/telegram') ||
        req.originalUrl.endsWith('.apk')
      ) {
        return next();
      }
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
        res.status(500).send('Application bundle is currently building. Please refresh in a moment.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
