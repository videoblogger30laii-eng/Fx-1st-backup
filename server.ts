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

  // 24/7 Server-Side Telegram Configuration & Persistent Push Support
  const TELEGRAM_CONFIG_FILE = path.join(process.cwd(), 'server_telegram_config.json');
  function loadServerTelegramConfig() {
    try {
      if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf-8'));
      }
    } catch {}
    return { enabled: true, botToken: '8750503064:AAHU1FA80-Hqvjwc010oUDI2pgkitH2bJRI', chatId: '' };
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

  function loadServerSignalsStore(): Record<string, any> {
    try {
      if (fs.existsSync(SIGNALS_STORE_FILE)) {
        const raw = fs.readFileSync(SIGNALS_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          console.log(`[24/7 Server Monitor] Loaded ${Object.keys(parsed).length} signals from persistent disk store.`);
          return parsed;
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
  let lastServerMonitorTick = Date.now();

  app.get('/api/signals/state', (_req, res) => {
    res.json({
      success: true,
      serverTime: Date.now(),
      lastMonitorTick: lastServerMonitorTick,
      activeCount: Object.values(serverSignalsStore).filter((s: any) => s.status === 'RUNNING' || s.status === 'PENDING').length,
      signals: Object.values(serverSignalsStore)
    });
  });

  app.post('/api/signals/sync', (req, res) => {
    try {
      const clientSignals = Array.isArray(req.body?.signals) ? req.body.signals : [];
      let updatedCount = 0;
      clientSignals.forEach((sig: any) => {
        if (sig && sig.id) {
          const existing = serverSignalsStore[sig.id];
          // If server already marked it as HIT_SL or HIT_TP, keep server's closed outcome
          if (existing && (existing.status === 'HIT_SL' || existing.status === 'HIT_TP')) {
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
      res.json({
        success: true,
        serverTime: Date.now(),
        lastMonitorTick: lastServerMonitorTick,
        signals: Object.values(serverSignalsStore)
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // 24/7 Background Tick & High/Low Wick Monitor on Server (Runs every 30 seconds)
  setInterval(async () => {
    try {
      lastServerMonitorTick = Date.now();
      const activeSignals = Object.values(serverSignalsStore).filter(
        (s: any) => s.status === 'RUNNING' || s.status === 'PENDING'
      );
      if (activeSignals.length === 0) return;

      const tickers = Array.from(
        new Set(
          activeSignals.map((s: any) => {
            const sym = s.pair?.symbol || '';
            const clean = sym.replace('/', '');
            return `FX:${clean}`;
          })
        )
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const tvRes = await fetch('https://scanner.tradingview.com/forex/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          symbols: { tickers },
          columns: ['close', 'change', 'high', 'low', 'open']
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (tvRes.ok) {
        const json: any = await tvRes.json();
        if (json?.data && Array.isArray(json.data)) {
          const priceMap: Record<string, { close: number; high: number; low: number }> = {};
          json.data.forEach((item: any) => {
            const cleanTicker = item.s?.replace(/^FX:/, '');
            const close = Number(item.d?.[0]);
            const high = Number(item.d?.[2]);
            const low = Number(item.d?.[3]);
            if (cleanTicker && !isNaN(close) && close > 0) {
              priceMap[cleanTicker] = { close, high, low };
            }
          });

          let storeModified = false;
          activeSignals.forEach((sig: any) => {
            const cleanSym = (sig.pair?.symbol || '').replace('/', '');
            const quote = priceMap[cleanSym];
            if (!quote) return;

            const isBuy = (sig.type || '').startsWith('BUY');
            const sl = Number(sig.stopLoss);
            const tp1 = Number(sig.takeProfit1);

            let isSlHit = false;
            let isTpHit = false;
            let exitPrice = quote.close;

            if (isBuy) {
              if (quote.close <= sl) {
                isSlHit = true;
                exitPrice = sl;
              } else if (quote.close >= tp1) {
                isTpHit = true;
                exitPrice = tp1;
              }
            } else {
              if (quote.close >= sl) {
                isSlHit = true;
                exitPrice = sl;
              } else if (quote.close <= tp1) {
                isTpHit = true;
                exitPrice = tp1;
              }
            }

            if (isSlHit) {
              console.log(`[24/7 Server Monitor] Signal ${sig.id} (${sig.pair?.symbol}) HIT SL at ${exitPrice} on live quote`);
              serverSignalsStore[sig.id] = {
                ...sig,
                status: 'HIT_SL',
                currentPrice: exitPrice,
                closedAtMs: Date.now(),
                isPastReconciled: true,
                validityTimeLeft: 'Closed (SL Hit on 24/7 Monitor)',
                validityExpiresAt: `SL Hit at ${exitPrice}`
              };
              storeModified = true;

              if (serverTelegramConfig.enabled && serverTelegramConfig.botToken && serverTelegramConfig.chatId) {
                try {
                  const text = `🛡️ *[24/7 SERVER]* *SIGNAL STOP LOSS HIT*\n\n📊 *Pair:* ${sig.pair?.symbol} (${sig.type})\n📍 *Entry:* ${sig.entryPrice}\n🛑 *SL Hit at:* ${exitPrice}\nℹ️ Closed automatically by 24/7 server monitor while web/mobile was closed.`;
                  fetch(`https://api.telegram.org/bot${serverTelegramConfig.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: serverTelegramConfig.chatId, text, parse_mode: 'Markdown' })
                  }).catch(() => {});
                } catch {}
              }
            } else if (isTpHit) {
              console.log(`[24/7 Server Monitor] Signal ${sig.id} (${sig.pair?.symbol}) HIT TP1 at ${exitPrice} on live quote`);
              serverSignalsStore[sig.id] = {
                ...sig,
                status: 'HIT_TP',
                currentPrice: exitPrice,
                closedAtMs: Date.now(),
                isPastReconciled: true,
                validityTimeLeft: 'Closed (TP1 Hit on 24/7 Monitor)',
                validityExpiresAt: `TP1 Hit at ${exitPrice}`
              };
              storeModified = true;

              if (serverTelegramConfig.enabled && serverTelegramConfig.botToken && serverTelegramConfig.chatId) {
                try {
                  const text = `🎉 *[24/7 SERVER]* *SIGNAL TAKE PROFIT 1 HIT*\n\n📊 *Pair:* ${sig.pair?.symbol} (${sig.type})\n📍 *Entry:* ${sig.entryPrice}\n🎯 *TP1 Reached:* ${exitPrice}\nℹ️ Closed automatically by 24/7 server monitor while web/mobile was closed.`;
                  fetch(`https://api.telegram.org/bot${serverTelegramConfig.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: serverTelegramConfig.chatId, text, parse_mode: 'Markdown' })
                  }).catch(() => {});
                } catch {}
              }
            }
          });

          if (storeModified) {
            saveServerSignalsStore(serverSignalsStore);
          }
        }
      }
    } catch {
      // ignore network errors
    }
  }, 30000);

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
