import axios from 'axios';
import moment from 'moment';
import pMap from "p-map";

const apiUrl: string = 'http://localhost:3003/sync/produksi';

const delayPerTask = 3000;
const concurrency = 8;

// utils
type Period = {
  startDate: string;
  endDate: string;
  event: number;
};

const generatePeriods = (
  startDate: string,
  endDate: string,
  mode: 'quarter' | 'daily'
): Period[] => {
  const periods: Period[] = [];
  const start = moment(startDate);
  const end = moment(endDate);

  let current = start.clone();

  while (current.isSameOrBefore(end)) {
    let periodStart = current.clone();
    let periodEnd;

    if (mode === 'quarter') {
      periodEnd = current.clone().add(2, 'months').endOf('month');
    } else if (mode === 'daily') {
      periodEnd = current.clone(); // same day
    } else {
      throw new Error('Mode tidak dikenali');
    }

    // Hindari keluar dari range
    if (periodEnd.isAfter(end)) {
      periodEnd = end.clone();
    }

    periods.push({
      startDate: periodStart.format('YYYY-MM-DD'),
      endDate: periodEnd.format('YYYY-MM-DD'),
      event: 0
    });

    // Tambah sesuai mode
    current = mode === 'quarter'
      ? current.add(3, 'months').startOf('month')
      : current.add(1, 'day');
  }

  return periods;
};


const eventGenerator = (startEvent: string, endEvent: string) => {
  const data = [];
  const start = Number(startEvent);
  const end = Number(endEvent);


  const ascending = start <= end;
  const step = ascending ? 1 : -1;

  for (let i = start; ascending ? i < end : i > end; i += step) {

    data.push({
      startDate: "",
      endDate: "",
      event: i
    });
  }



  return data;
};


async function sendRequest(index: number, moda: string, requestBody: Record<string, any>): Promise<void> {
  const startTime = Date.now();
  try {
    console.log(`Request ke-${index + 1} (${moda}) ${requestBody?.event} ${requestBody?.tanggalAwal1} ${requestBody?.tanggalAkhir1}  mulai...`);
    const response = await axios.post(apiUrl, { ...requestBody, moda: moda });
    const duration = Date.now() - startTime;
    console.log(`✅ Request ke-${index + 1} (${moda}) ${requestBody?.event} ${requestBody?.tanggalAwal1} ${requestBody?.tanggalAkhir1} selesai! Status: ${response.status}. Durasi: ${duration} ms`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Request ke-${index + 1} (${moda}) ${requestBody?.event} ${requestBody?.tanggalAwal1} ${requestBody?.tanggalAkhir1} gagal setelah ${duration} ms. Error:`, error.message);
    if (error.response) {
      console.error('Data error:', error.response.data);
      console.error('Status error:', error.response.status);
    }
  }
}


async function startSendingRequests({ event, startDate, endDate }: { event?: string, startDate?: string, endDate?: string; }): Promise<void> {
  const modaList: Record<string, any>[] = [
    {
      moda: "jalan",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
    {
      moda: "asdp",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
    {
      moda: "arteri",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
    {
      moda: "toll",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
    {
      moda: "laut",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
    {
      moda: "udara",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
    {
      moda: "stasiun",
      tanggalAwal1: startDate,
      tanggalAkhir1: endDate,
      event: event ? event : 0
    },
  ];

  await pMap(
    modaList,
    async (item, index) => {

      if (!startDate) delete item.tanggalAwal1;
      if (!endDate) delete item.tanggalAkhir1;
      if (startDate && endDate) delete item.event;

      try {
        await sendRequest(index, item.moda, item);
        console.log(`done cronPertitik ${item.moda}`);
      } catch (err) {
        console.error(`Error cronPertitik ${item.moda}:`, err);
      }
    }, { concurrency });
}

// mainFunction
async function main({ isEvent, moda }: { isEvent: boolean; moda?: string; }) {
  const events = eventGenerator("22", "01");
  const startDate = "2024-01-01";
  const endDate = "2024-12-31";

  const selectedEvent = {
    event: 0,
    eventPantau: 0,
    startDate,
    endDate,
  };

  if (!isEvent && moda) {
    const { data } = await axios({
      method: "post",
      url: `https://strategi.kemenhub.go.id/api/hubnet/data-event/${moda}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
    const tmpSelected = data?.data?.find((item: any) => item.id === Number(22));

    if (data?.data && tmpSelected) {
      selectedEvent.event = tmpSelected.id;
      selectedEvent.eventPantau = tmpSelected.id;
      selectedEvent.startDate = tmpSelected.tanggal_mulai;
      selectedEvent.endDate = tmpSelected.tanggal_selesai;
    }
  }

  const periods = generatePeriods(selectedEvent.startDate, selectedEvent.endDate, "quarter");

  const totalStart = Date.now();

  await pMap(
    isEvent ? events : periods,
    async (item) => {
      try {
        console.log(`start main :`, item);

        await startSendingRequests({ startDate: item?.startDate, endDate: item?.endDate, event: String(item.event) });
        console.log(`done main :`, item);
      } catch (err) {
        console.error(`Error cronPertitik :`, item, err);
      }
    }, { concurrency: 6 });

  const totalDuration = Date.now() - totalStart;
  console.log(`🚀 Semua request selesai dikirim oleh MAIN. Total waktu: ${totalDuration} ms (${(totalDuration / 1000).toFixed(2)} detik)`);

}

// startSendingRequests({});

//  od event tetep false line 197 ganti daily
main({ isEvent: true });