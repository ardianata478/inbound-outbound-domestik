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

const username = process.env.USERNAME_API;
const password = process.env.PASSWORD_API;

const token = btoa(`${username}:${password}`);

app.get('/', async (c) => {

  const query = c.req.query();

  const tanggal_awal = query.tanggal_awal ?? moment().subtract(1, 'days').format('YYYY-MM-DD');
  const tanggal_akhir = query.tanggal_akhir ?? moment().format('YYYY-MM-DD');

  const data = await axios.post(`${process.env.HOST}?tanggal_awal=${tanggal_awal}&tanggal_akhir=${tanggal_akhir}`,
    {
      "tanggal_awal_1": tanggal_awal,
      "tanggal_akhir_1": tanggal_akhir,
      "tanggal_awal_2": "",
      "tanggal_akhir_2": "",
      "provinsi": "",
      "moda": "laut",
      "endpoints": [
        "data-produksi"
      ]
    }
    , {
      headers: {
        Authorization: `Basic ${token}`
      }
    }
  );

  //  cek data ada jenis include inbound, outbound, domestik
  const normalizeKategori = (kategori: string): NormalizedKategori => {
    const lower = kategori.toLowerCase();
    if (lower.includes('inbound')) return 'inbound';
    if (lower.includes('outbound')) return 'outbound';
    return 'domestik';
  };

  //  cek data ada jenis include penumpang, kapal, pesawat
  const normalizeJenis = (jenis: string): NormalizedJenis => {
    if (jenis.includes('Penumpang')) return 'penumpang';
    if (jenis.includes('Kapal')) return 'kapal';
    if (jenis.includes('Pesawat')) return 'pesawat';
    throw new Error(`Unknown jenis: ${jenis}`);
  };

  // group by moda,  by jenis,  by kategori
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
