/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");

const port = Number(process.env.MOCK_HERMES_PORT || 4001);
const expectedToken = process.env.HERMES_API_TOKEN || "dev-token";

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function readAttr(product, key) {
  const value = product && product.attributes ? product.attributes[key] : "";
  return value === undefined || value === null ? "" : String(value).trim();
}

function includesValue(allowed, actual) {
  if (!allowed || !actual) return true;
  return allowed
    .split(/[,\n/|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(actual.trim().toLowerCase());
}

function validateAssembly(server, components) {
  const serverProduct = server.product || {};
  const issues = [];
  const explicitlySupportedCategories = readAttr(serverProduct, "supportedComponentCategories");

  for (const component of components) {
    const product = component.product || {};
    const category = String(product.category || "").toUpperCase();
    const categoryIsExplicitlySupported = Boolean(explicitlySupportedCategories) && includesValue(explicitlySupportedCategories, category);

    if (category === "MEMORY") {
      const generation = readAttr(product, "generation");
      const type = readAttr(product, "type");
      const allowedGeneration = readAttr(serverProduct, "ramGeneration");
      const allowedType = readAttr(serverProduct, "ramType");
      if (!allowedGeneration || !includesValue(allowedGeneration, generation)) {
        issues.push({
          componentId: component.id,
          serialNumber: component.serialNumber,
          severity: "ERROR",
          message: allowedGeneration
            ? `RAM chuẩn ${generation || "không rõ"} không phù hợp với server này.`
            : "Server chưa khai báo chuẩn RAM hỗ trợ, không được lắp RAM.",
        });
      }
      if (!allowedType || !includesValue(allowedType, type)) {
        issues.push({
          componentId: component.id,
          serialNumber: component.serialNumber,
          severity: "ERROR",
          message: allowedType
            ? `RAM loại ${type || "không rõ"} không phù hợp với server này.`
            : "Server chưa khai báo loại RAM hỗ trợ, không được lắp RAM.",
        });
      }
    }

    if (category === "STORAGE") {
      const formFactor = readAttr(product, "formFactor") || readAttr(product, "size");
      const storageInterface = readAttr(product, "interface");
      const allowedFormFactor = readAttr(serverProduct, "driveFormFactor");
      const allowedInterface = readAttr(serverProduct, "driveInterface");
      if (!allowedFormFactor || !includesValue(allowedFormFactor, formFactor)) {
        issues.push({
          componentId: component.id,
          serialNumber: component.serialNumber,
          severity: "ERROR",
          message: allowedFormFactor
            ? `Ổ cứng kích thước ${formFactor || "không rõ"} không phù hợp với bay của server này.`
            : "Server chưa khai báo kích thước ổ cứng hỗ trợ, không được lắp ổ cứng.",
        });
      }
      if (!allowedInterface || !includesValue(allowedInterface, storageInterface)) {
        issues.push({
          componentId: component.id,
          serialNumber: component.serialNumber,
          severity: "ERROR",
          message: allowedInterface
            ? `Ổ cứng chuẩn ${storageInterface || "không rõ"} không phù hợp với server này.`
            : "Server chưa khai báo chuẩn ổ cứng hỗ trợ, không được lắp ổ cứng.",
        });
      }
    }

    if (category === "MODULE") {
      const moduleType = readAttr(product, "moduleType") || readAttr(product, "type") || readAttr(product, "interface");
      const allowedModuleTypes = readAttr(serverProduct, "moduleType") || readAttr(serverProduct, "supportedModules") || readAttr(serverProduct, "moduleInterface");
      if (!categoryIsExplicitlySupported && (!allowedModuleTypes || !includesValue(allowedModuleTypes, moduleType))) {
        issues.push({
          componentId: component.id,
          serialNumber: component.serialNumber,
          severity: "ERROR",
          message: allowedModuleTypes
            ? `Module ${moduleType || "không rõ loại"} không phù hợp với server này.`
            : "Thiết bị chính chưa khai báo hỗ trợ MODULE, không được lắp module.",
        });
      }
    }

    if (!["MEMORY", "STORAGE", "MODULE"].includes(category) && !categoryIsExplicitlySupported) {
      issues.push({
        componentId: component.id,
        serialNumber: component.serialNumber,
        severity: "ERROR",
        message: `Thiết bị chính chưa khai báo hỗ trợ linh kiện loại ${category || "không rõ"}, không được lắp.`,
      });
    }
  }

  return {
    success: true,
    compatible: issues.every((issue) => issue.severity !== "ERROR"),
    confidence: issues.length > 0 ? 0.87 : 0.92,
    issues,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { status: "ok", service: "mock-hermes", version: "dev" });
    return;
  }

  if (req.method !== "POST" || !["/server-specs/suggest", "/assembly/validate"].includes(req.url)) {
    sendJson(res, 404, { success: false, error: { message: "Not found" } });
    return;
  }

  const authHeader = req.headers.authorization || "";
  if (authHeader !== `Bearer ${expectedToken}`) {
    sendJson(res, 401, { success: false, error: { message: "Invalid Hermes token" } });
    return;
  }

  try {
    const body = await readBody(req);
    if (req.url === "/assembly/validate") {
      sendJson(res, 200, validateAssembly(body.server || {}, Array.isArray(body.components) ? body.components : []));
      return;
    }

    const text = `${body.name || ""} ${body.model || body.modelNumber || ""}`.toLowerCase();

    if (text.includes("timeout")) {
      setTimeout(() => {
        sendJson(res, 200, {
          success: true,
          confidence: 0.3,
          suggestions: { manufacturer: "Timeout Lab" },
          warnings: ["Mock Hermes phản hồi chậm."],
        });
      }, 20_000);
      return;
    }

    if (text.includes("unknown")) {
      sendJson(res, 422, {
        success: false,
        error: { code: "MODEL_NOT_FOUND", message: "Không tìm thấy thông tin server phù hợp." },
      });
      return;
    }

    const isHp = text.includes("dl380") || text.includes("hpe") || text.includes("hp");
    sendJson(res, 200, {
      success: true,
      confidence: isHp ? 0.88 : 0.91,
      suggestions: isHp
        ? {
            manufacturer: "HPE",
            model: "ProLiant DL380 Gen10",
            uHeight: 2,
            dimmSlots: 24,
            driveBays: 8,
            ramGeneration: "DDR4",
            ramType: "RDIMM",
            driveFormFactor: "2.5",
            driveInterface: "SAS,SATA,NVMe",
          }
        : {
            manufacturer: "Dell",
            model: "PowerEdge R740",
            uHeight: 2,
            dimmSlots: 24,
            driveBays: 8,
            ramGeneration: "DDR4",
            ramType: "RDIMM",
            driveFormFactor: "2.5",
            driveInterface: "SAS,SATA,NVMe",
          },
      warnings: ["Dữ liệu mock chỉ dùng để test local, không phải thông tin tra cứu thật."],
      sources: [],
    });
  } catch {
    sendJson(res, 400, { success: false, error: { message: "Invalid JSON body" } });
  }
});

server.listen(port, () => {
  console.log(`Mock Hermes listening on http://localhost:${port}`);
});
