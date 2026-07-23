import { Suspense } from "react";
import { BaseKarmaApp } from "@/components/base-karma-app";

export default function Home() {
  return (
    <Suspense>
      <BaseKarmaApp />
    </Suspense>
  );
}
