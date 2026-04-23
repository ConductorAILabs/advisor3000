import { Turbopuffer } from "@turbopuffer/turbopuffer";

let _tpuf: Turbopuffer | null = null;

function getTpuf() {
  if (!_tpuf) {
    _tpuf = new Turbopuffer({
      apiKey: process.env.TURBOPUFFER_API_KEY!,
      region: "api",
    });
  }
  return _tpuf;
}

export function getNamespace(name: string = "adjudge-ads") {
  return getTpuf().namespace(name);
}
