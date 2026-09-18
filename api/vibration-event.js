import { createClient } from "@supabase/supabase-js";

// Threshold magnitude (dalam satuan g) - sesuaikan setelah kalibrasi sensor asli
const THRESHOLDS = {
  RINGAN: 1.2,
  SEDANG: 2.0,
  KUAT: 3.5,
};

const STATUS_LABELS = {
  0: "Normal",
  1: "Getaran Ringan",
  2: "Getaran Sedang",
  3: "Getaran Kuat",
};

// Status minimal yang memicu notifikasi WhatsApp
const WA_TRIGGER_STATUS = 2;

function hitungStatus(magnitude) {
  if (magnitude >= THRESHOLDS.KUAT) return 3;
  if (magnitude >= THRESHOLDS.SEDANG) return 2;
  if (magnitude >= THRESHOLDS.RINGAN) return 1;
  return 0;
}

async function kirimWhatsApp(supabase, event) {
  const { data: kontak, error } = await supabase
    .from("whatsapp_config")
    .select("phone_number")
    .eq("active", true);

  if (error || !kontak || kontak.length === 0) {
    console.error("Tidak ada kontak WA aktif:", error?.message);
    return;
  }

  const pesan =
    `*PERINGATAN GETARAN* \n\n` +
    `Status: ${event.nama_status}\n` +
    `Magnitude: ${event.magnitude.toFixed(2)} g\n` +
    `Alat: ${event.device_id}\n` +
    `Waktu: ${new Date().toLocaleString("id-ID")}`;

  const targets = kontak.map((k) => k.phone_number).join(",");

  await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_TOKEN,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      target: targets,
      message: pesan,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { device_id, accel_x, accel_y, accel_z } = req.body;

  if (!device_id || accel_x === undefined || accel_y === undefined || accel_z === undefined) {
    return res.status(400).json({
      error: "device_id, accel_x, accel_y, accel_z wajib diisi",
    });
  }

  const magnitude = Math.sqrt(accel_x ** 2 + accel_y ** 2 + accel_z ** 2);
  const status = hitungStatus(magnitude);
  const nama_status = STATUS_LABELS[status];

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

    const eventData = {
    device_id,
    accel_x,
    accel_y,
    accel_z,
    magnitude,
    rms: magnitude,
    peak: magnitude,
    status,
    nama_status,
  };

  const { error: insertError } = await supabase
    .from("vibration_events")
    .insert(eventData);

  if (insertError) {
    console.error("Gagal insert:", insertError.message);
    return res.status(500).json({ error: insertError.message });
  }

  if (status >= WA_TRIGGER_STATUS) {
    await kirimWhatsApp(supabase, eventData);
  }

  return res.status(200).json({
    success: true,
    status,
    nama_status,
    magnitude: magnitude.toFixed(2),
  });
}