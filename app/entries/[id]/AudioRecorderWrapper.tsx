"use client";

import { useRouter } from "next/navigation";
import AudioRecorder from "@/components/AudioRecorder";

export default function AudioRecorderWrapper({ entryId }: { entryId: string }) {
  const router = useRouter();
  return <AudioRecorder entryId={entryId} onUploaded={() => router.refresh()} />;
}
