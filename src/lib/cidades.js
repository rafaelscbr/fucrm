// Coordenadas [lng, lat] das principais cidades da região Sul (área de atuação).
const RAW = {
  'blumenau': [-49.066, -26.919], 'itajai': [-48.661, -26.908], 'brusque': [-48.917, -27.098],
  'joinville': [-48.846, -26.304], 'florianopolis': [-48.548, -27.594], 'sao jose': [-48.638, -27.615],
  'palhoca': [-48.668, -27.645], 'balneario camboriu': [-48.630, -26.990], 'itapema': [-48.611, -27.090],
  'jaragua do sul': [-49.071, -26.485], 'gaspar': [-48.958, -26.931], 'rio do sul': [-49.643, -27.214],
  'criciuma': [-49.370, -28.678], 'tubarao': [-49.007, -28.467], 'lages': [-50.326, -27.816],
  'chapeco': [-52.618, -27.096], 'concordia': [-52.028, -27.234], 'sao bento do sul': [-49.378, -26.250],
  'caxias do sul': [-51.179, -29.168], 'bento goncalves': [-51.518, -29.171], 'porto alegre': [-51.230, -30.033],
  'novo hamburgo': [-51.130, -29.687], 'passo fundo': [-52.407, -28.263], 'santa maria': [-53.807, -29.684],
  'pelotas': [-52.342, -31.769], 'gramado': [-50.874, -29.379],
  'curitiba': [-49.273, -25.428], 'sao jose dos pinhais': [-49.206, -25.535], 'londrina': [-51.163, -23.310],
  'maringa': [-51.938, -23.425], 'ponta grossa': [-50.162, -25.095], 'cascavel': [-53.455, -24.955],
  'foz do iguacu': [-54.588, -25.516], 'pinhais': [-49.192, -25.445],
}

// Normaliza removendo tudo que não for a-z, 0-9 ou espaço (tira acentos após NFD).
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, '').trim()
}

export function coordCidade(cidade) {
  return RAW[norm(cidade)] || null
}
