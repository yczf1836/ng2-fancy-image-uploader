import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {Observable} from 'rxjs/Observable';
import {UploadedFile} from './uploaded-file';
import {FileUploaderOptions} from './interfaces';

@Injectable()
export class FileUploader {
  private _fileProgress$: Subject<UploadedFile>;

  constructor() {
    this._fileProgress$ = <Subject<UploadedFile>>new Subject();
  }

  get fileProgress$() {
    return this._fileProgress$.asObservable();
  }

  uploadFile(file: File, options: FileUploaderOptions): string {
    this.setDefaults(options);
    let xhr = new XMLHttpRequest();
    let form = new FormData();
    form.append(options.fieldName, file, file.name);

    let uploadingFile = new UploadedFile(
        this.generateRandomIndex(),
        file.name,
        file.size
    );

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        let percent = Math.round(e.loaded / e.total * 100);
        uploadingFile.progress = percent;
        this._fileProgress$.next(uploadingFile);
      }
    };

    xhr.upload.onabort = (e: Event) => {
      uploadingFile.setAbort();
      this._fileProgress$.next(uploadingFile);
    };

    xhr.upload.onerror = (e: Event) => {
      uploadingFile.setError();
      this._fileProgress$.next(uploadingFile);
    };

    xhr.onload = () => {
      let success = this.isSuccessCode(xhr.status);

      if (!success) {
          uploadingFile.setError();
      }

      uploadingFile.onFinished(
          xhr.status,
          xhr.statusText,
          xhr.response
      );

      this._fileProgress$.next(uploadingFile);
    }

    xhr.open(options.httpMethod, options.uploadUrl, true);
    xhr.withCredentials = options.withCredentials;

    if (options.customHeaders) {
      Object.keys(options.customHeaders).forEach((key) => {
        xhr.setRequestHeader(key, options.customHeaders[key]);
      });
    }

    if (options.authToken) {
      xhr.setRequestHeader("Authorization", `${options.authTokenPrefix} ${options.authToken}`);
    }

    xhr.send(form);
    return uploadingFile.id;
  }

  private setDefaults(options: FileUploaderOptions) {
    options.withCredentials = options.withCredentials || false;
    options.httpMethod = options.httpMethod || 'POST';
    options.authTokenPrefix = options.authTokenPrefix || 'Bearer';
    options.fieldName = options.fieldName || 'file';
  }

  private isSuccessCode(status:number):boolean {
    return (status >= 200 && status < 300) || status === 304;
  }

  private generateRandomIndex(): string {
    return Math.random().toString(36).substring(7);
  }
}