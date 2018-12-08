var makeHttpRequest = (obj, success, failure) => {
  let xhr = new XMLHttpRequest();
  xhr.open(obj.method || "GET", obj.url);
  if (obj.headers) {
    Object.keys(obj.headers).forEach(key => {
      xhr.setRequestHeader(key, obj.headers[key]);
    });
  }
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      success(xhr);
    } else {
      failure(xhr);
    }
  };
  xhr.onerror = () => failure(xhr);
  xhr.send(obj.body);
};

export { makeHttpRequest };
