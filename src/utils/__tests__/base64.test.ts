import { base64ToArrayBuffer } from "../base64";

function toArray(base64: string): number[] {
  return Array.from(new Uint8Array(base64ToArrayBuffer(base64)));
}

function toText(base64: string): string {
  return toArray(base64)
    .map((byte) => String.fromCharCode(byte))
    .join("");
}

describe("base64ToArrayBuffer", () => {
  it("dolgusuz metni çözer (uzunluk 4'ün katı)", () => {
    expect(toText("TWFu")).toBe("Man");
  });

  it("tek dolgulu metni çözer", () => {
    expect(toText("TWE=")).toBe("Ma");
  });

  it("çift dolgulu metni çözer", () => {
    expect(toText("TQ==")).toBe("M");
  });

  it("uzun metinde bayt sayısı doğru", () => {
    const buffer = base64ToArrayBuffer("SGVsbG8sIFdvcmxkIQ==");
    expect(buffer.byteLength).toBe(13);
    expect(toText("SGVsbG8sIFdvcmxkIQ==")).toBe("Hello, World!");
  });

  it("boş girdi boş tampon verir", () => {
    expect(base64ToArrayBuffer("").byteLength).toBe(0);
  });

  it("satır sonlarını ve boşlukları yok sayar", () => {
    expect(toText("TWFu\nTWFu\r\n  TWFu")).toBe("ManManMan");
  });

  it("data URI önekini atar", () => {
    // Önekin harfleri de geçerli base64 karakterleri; sadece "geçersizi atla"
    // mantığı bunu temizleyemez, bu yüzden ayrı bir test hak ediyor.
    expect(toText("data:image/jpeg;base64,TWFu")).toBe("Man");
  });

  it("ikili baytları bozmadan çözer (JPEG başlığı)", () => {
    // FF D8 FF E0 - her JPEG dosyasının ilk dört baytı.
    expect(toArray("/9j/4A==")).toEqual([0xff, 0xd8, 0xff, 0xe0]);
  });
});
