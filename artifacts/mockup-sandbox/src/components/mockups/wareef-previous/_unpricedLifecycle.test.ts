import { runUnpricedLifecycleChecks } from "./_demoStore";

if (!runUnpricedLifecycleChecks()) {
  throw new Error("Unpriced standard and assessment request lifecycle failed");
}