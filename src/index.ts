import axios from 'axios';
import { Hono } from 'hono';
import _ from 'lodash';
import moment from 'moment';

type Entry = {
  moda: string;
  tanggal: string;
  jenis: string;
  kategori: string;
  value: string;
};

type NormalizedKategori = 'domestik' | 'inbound' | 'outbound';
type NormalizedJenis = 'penumpang' | 'kapal' | 'pesawat';
type Moda = string;

type Result = {
  [moda in Moda]: {
    [jenis in NormalizedJenis]?: {
      [kategori in NormalizedKategori]?: number;
    };
  };
};

const app = new Hono();

const username = 'dashboard';
const password = 'sUxLTKpvnrpLHLJ';
const token = btoa(`${username}:${password}`);

app.get('/', async (c) => {

  const query = c.req.query();

  const tanggal_awal = query.tanggal_awal ?? moment().subtract(1, 'days').format('YYYY-MM-DD');
  const tanggal_akhir = query.tanggal_akhir ?? moment().format('YYYY-MM-DD');

  const data = await axios.post(`https://hubnet.kemenhub.go.id/backend/api/siasati/pergerakan-domestik-internasional?tanggal_awal=${tanggal_awal}&tanggal_akhir=${tanggal_akhir}`, {

  }, {
    headers: {
      Authorization: `Basic ${token}`
    }
  }
  );

  const normalizeKategori = (kategori: string): NormalizedKategori => {
    const lower = kategori.toLowerCase();
    if (lower.includes('inbound')) return 'inbound';
    if (lower.includes('outbound')) return 'outbound';
    return 'domestik';
  };

  const normalizeJenis = (jenis: string): NormalizedJenis => {
    if (jenis.includes('Penumpang')) return 'penumpang';
    if (jenis.includes('Kapal')) return 'kapal';
    if (jenis.includes('Pesawat')) return 'kapal';
    throw new Error(`Unknown jenis: ${jenis}`);
  };

  const result: Result = _(data.data.data)
    .groupBy(d => d.moda.toLowerCase())
    .mapValues(modas =>
      _(modas)
        .groupBy(d => normalizeJenis(d.jenis))
        .mapValues(jenisGroup =>
          _(jenisGroup)
            .groupBy(d => normalizeKategori(d.kategori))
            .mapValues(kats => _.sumBy(kats, d => Number(d.value)))
            .value()
        )
        .value()
    )
    .value();
  return c.json({ result, tanggal_awal, tanggal_akhir });
});

export default app;
