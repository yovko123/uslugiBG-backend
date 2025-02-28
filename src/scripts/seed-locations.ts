import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting location data seed...');
    
    // Add Bulgaria
    console.log('Creating/updating country data...');
    const bulgaria = await prisma.$queryRaw`
      INSERT INTO "Country" ("name", "nameBg", "code", "createdAt", "updatedAt")
      VALUES ('Bulgaria', 'България', 'BG', NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE 
      SET "name" = 'Bulgaria',
          "nameBg" = 'България',
          "updatedAt" = NOW()
      RETURNING *
    ` as any[];
    
    const bulgariaId = bulgaria[0].id;
    console.log(`Country created with ID: ${bulgariaId}`);

    // All 28 regions (oblasti) in Bulgaria
    const bulgarianRegions = [
      { name: 'Blagoevgrad', nameBg: 'Благоевград' },
      { name: 'Burgas', nameBg: 'Бургас' },
      { name: 'Dobrich', nameBg: 'Добрич' },
      { name: 'Gabrovo', nameBg: 'Габрово' },
      { name: 'Haskovo', nameBg: 'Хасково' },
      { name: 'Kardzhali', nameBg: 'Кърджали' },
      { name: 'Kyustendil', nameBg: 'Кюстендил' },
      { name: 'Lovech', nameBg: 'Ловеч' },
      { name: 'Montana', nameBg: 'Монтана' },
      { name: 'Pazardzhik', nameBg: 'Пазарджик' },
      { name: 'Pernik', nameBg: 'Перник' },
      { name: 'Pleven', nameBg: 'Плевен' },
      { name: 'Plovdiv', nameBg: 'Пловдив' },
      { name: 'Razgrad', nameBg: 'Разград' },
      { name: 'Ruse', nameBg: 'Русе' },
      { name: 'Shumen', nameBg: 'Шумен' },
      { name: 'Silistra', nameBg: 'Силистра' },
      { name: 'Sliven', nameBg: 'Сливен' },
      { name: 'Smolyan', nameBg: 'Смолян' },
      { name: 'Sofia-city', nameBg: 'София-град' },
      { name: 'Sofia-province', nameBg: 'София-област' },
      { name: 'Stara Zagora', nameBg: 'Стара Загора' },
      { name: 'Targovishte', nameBg: 'Търговище' },
      { name: 'Varna', nameBg: 'Варна' },
      { name: 'Veliko Tarnovo', nameBg: 'Велико Търново' },
      { name: 'Vidin', nameBg: 'Видин' },
      { name: 'Vratsa', nameBg: 'Враца' },
      { name: 'Yambol', nameBg: 'Ямбол' }
    ];

    // Insert states
    console.log('Creating/updating region data...');
    const createdStates = [];
    
    for (const region of bulgarianRegions) {
      const state = await prisma.$queryRaw`
        INSERT INTO "State" ("name", "nameBg", "countryId", "createdAt", "updatedAt") 
        VALUES (${region.name}, ${region.nameBg}, ${bulgariaId}, NOW(), NOW())
        ON CONFLICT ("name", "countryId") DO UPDATE
        SET "nameBg" = ${region.nameBg}, "updatedAt" = NOW()
        RETURNING *
      `;
      
      const stateObj = Array.isArray(state) ? state[0] : state;
      createdStates.push(stateObj);
      console.log(`Region created: ${stateObj.name} with ID: ${stateObj.id}`);
    }

    // Cities data by region with postal codes
    const citiesData = [
      // Blagoevgrad region
      { name: 'Blagoevgrad', nameBg: 'Благоевград', state: 'Blagoevgrad', postalCode: '2700' },
      { name: 'Bansko', nameBg: 'Банско', state: 'Blagoevgrad', postalCode: '2770' },
      { name: 'Petrich', nameBg: 'Петрич', state: 'Blagoevgrad', postalCode: '2850' },
      { name: 'Sandanski', nameBg: 'Сандански', state: 'Blagoevgrad', postalCode: '2800' },
      { name: 'Razlog', nameBg: 'Разлог', state: 'Blagoevgrad', postalCode: '2760' },
      { name: 'Gotse Delchev', nameBg: 'Гоце Делчев', state: 'Blagoevgrad', postalCode: '2900' },
      { name: 'Simitli', nameBg: 'Симитли', state: 'Blagoevgrad', postalCode: '2730' },
      { name: 'Kresna', nameBg: 'Кресна', state: 'Blagoevgrad', postalCode: '2840' },
      { name: 'Yakoruda', nameBg: 'Якоруда', state: 'Blagoevgrad', postalCode: '2790' },
      { name: 'Belitsa', nameBg: 'Белица', state: 'Blagoevgrad', postalCode: '2780' },
      { name: 'Dobrinishte', nameBg: 'Добринище', state: 'Blagoevgrad', postalCode: '2777' },
      
      // Burgas region
      { name: 'Burgas', nameBg: 'Бургас', state: 'Burgas', postalCode: '8000' },
      { name: 'Nesebar', nameBg: 'Несебър', state: 'Burgas', postalCode: '8230' },
      { name: 'Pomorie', nameBg: 'Поморие', state: 'Burgas', postalCode: '8200' },
      { name: 'Sozopol', nameBg: 'Созопол', state: 'Burgas', postalCode: '8130' },
      { name: 'Karnobat', nameBg: 'Карнобат', state: 'Burgas', postalCode: '8400' },
      { name: 'Sunny Beach', nameBg: 'Слънчев бряг', state: 'Burgas', postalCode: '8240' },
      { name: 'Primorsko', nameBg: 'Приморско', state: 'Burgas', postalCode: '8290' },
      { name: 'Ahtopol', nameBg: 'Ахтопол', state: 'Burgas', postalCode: '8280' },
      { name: 'Aheloy', nameBg: 'Ахелой', state: 'Burgas', postalCode: '8217' },
      { name: 'Ravda', nameBg: 'Равда', state: 'Burgas', postalCode: '8238' },
      { name: 'Sveti Vlas', nameBg: 'Свети Влас', state: 'Burgas', postalCode: '8256' },
      { name: 'Obzor', nameBg: 'Обзор', state: 'Burgas', postalCode: '8250' },
      { name: 'Tsarevo', nameBg: 'Царево', state: 'Burgas', postalCode: '8260' },
      { name: 'Lozenets', nameBg: 'Лозенец', state: 'Burgas', postalCode: '8277' },
      { name: 'Chernomorets', nameBg: 'Черноморец', state: 'Burgas', postalCode: '8142' },
      { name: 'Sinemorets', nameBg: 'Синеморец', state: 'Burgas', postalCode: '8279' },
      { name: 'Kiten', nameBg: 'Китен', state: 'Burgas', postalCode: '8183' },
      { name: 'Aytos', nameBg: 'Айтос', state: 'Burgas', postalCode: '8500' },
      { name: 'Malko Tarnovo', nameBg: 'Малко Търново', state: 'Burgas', postalCode: '8162' },
      { name: 'Sredets', nameBg: 'Средец', state: 'Burgas', postalCode: '8300' },
      { name: 'Kameno', nameBg: 'Камено', state: 'Burgas', postalCode: '8120' },
      { name: 'Sungurlare', nameBg: 'Сунгурларе', state: 'Burgas', postalCode: '8470' },
      { name: 'Ruen', nameBg: 'Руен', state: 'Burgas', postalCode: '8540' },
      { name: 'Sarafovo', nameBg: 'Сарафово', state: 'Burgas', postalCode: '8015' },
      { name: 'Duni', nameBg: 'Дюни', state: 'Burgas', postalCode: '8133' },
      { name: 'Dyulevo', nameBg: 'Дюлево', state: 'Burgas', postalCode: '8239' },
      
      // Dobrich region
      { name: 'Tervel', nameBg: 'Тервел', state: 'Dobrich', postalCode: '9450' },
      { name: 'Krushari', nameBg: 'Крушари', state: 'Dobrich', postalCode: '9410' },
      { name: 'Dobrich', nameBg: 'Добрич', state: 'Dobrich', postalCode: '9300' },
      { name: 'Balchik', nameBg: 'Балчик', state: 'Dobrich', postalCode: '9600' },
      { name: 'Kavarna', nameBg: 'Каварна', state: 'Dobrich', postalCode: '9650' },
      { name: 'Shabla', nameBg: 'Шабла', state: 'Dobrich', postalCode: '9680' },
      { name: 'General Toshevo', nameBg: 'Генерал Тошево', state: 'Dobrich', postalCode: '9500' },
      { name: 'Durankulak', nameBg: 'Дуранкулак', state: 'Dobrich', postalCode: '9670' },
      { name: 'Ezerets', nameBg: 'Езерец', state: 'Dobrich', postalCode: '9683' },
      
      // Gabrovo region
      { name: 'Gabrovo', nameBg: 'Габрово', state: 'Gabrovo', postalCode: '5300' },
      { name: 'Sevlievo', nameBg: 'Севлиево', state: 'Gabrovo', postalCode: '5400' },
      { name: 'Dryanovo', nameBg: 'Дряново', state: 'Gabrovo', postalCode: '5370' },
      { name: 'Tryavna', nameBg: 'Трявна', state: 'Gabrovo', postalCode: '5350' },
      { name: 'Plachkovtsi', nameBg: 'Плачковци', state: 'Gabrovo', postalCode: '5360' },
      { name: 'Kran', nameBg: 'Кран', state: 'Gabrovo', postalCode: '5347' },
      
      // Haskovo region
      { name: 'Simeonovgrad', nameBg: 'Симеоновград', state: 'Haskovo', postalCode: '6490' },
      { name: 'Lyubimets', nameBg: 'Любимец', state: 'Haskovo', postalCode: '6550' },
      { name: 'Madzharovo', nameBg: 'Маджарово', state: 'Haskovo', postalCode: '6480' },
      { name: 'Topolovgrad', nameBg: 'Тополовград', state: 'Haskovo', postalCode: '6560' },
      { name: 'Stambolovo', nameBg: 'Стамболово', state: 'Haskovo', postalCode: '6362' },
      { name: 'Mineralni Bani', nameBg: 'Минерални Бани', state: 'Haskovo', postalCode: '6343' },
      
      // Kardzhali region
      { name: 'Kardzhali', nameBg: 'Кърджали', state: 'Kardzhali', postalCode: '6600' },
      { name: 'Momchilgrad', state: 'Kardzhali', postalCode: '6800' },
      { name: 'Krumovgrad', state: 'Kardzhali', postalCode: '6900' },
      { name: 'Ardino', state: 'Kardzhali', postalCode: '6750' },
      
      // Kyustendil region
      { name: 'Kyustendil', nameBg: 'Кюстендил', state: 'Kyustendil', postalCode: '2500' },
      { name: 'Dupnitsa', state: 'Kyustendil', postalCode: '2600' },
      { name: 'Bobov Dol', state: 'Kyustendil', postalCode: '2670' },
      { name: 'Sapareva Banya', state: 'Kyustendil', postalCode: '2650' },
      
      // Lovech region
      { name: 'Lovech', nameBg: 'Ловеч', state: 'Lovech', postalCode: '5500' },
      { name: 'Troyan', state: 'Lovech', postalCode: '5600' },
      { name: 'Teteven', state: 'Lovech', postalCode: '5700' },
      { name: 'Lukovit', state: 'Lovech', postalCode: '5770' },
      
      // Montana region
      { name: 'Montana', nameBg: 'Монтана', state: 'Montana', postalCode: '3400' },
      { name: 'Lom', state: 'Montana', postalCode: '3600' },
      { name: 'Berkovitsa', state: 'Montana', postalCode: '3500' },
      { name: 'Chiprovtsi', state: 'Montana', postalCode: '3460' },
      
      // Pazardzhik region
      { name: 'Pazardzhik', nameBg: 'Пазарджик', state: 'Pazardzhik', postalCode: '4400' },
      { name: 'Velingrad', state: 'Pazardzhik', postalCode: '4600' },
      { name: 'Panagyurishte', state: 'Pazardzhik', postalCode: '4500' },
      { name: 'Septemvri', state: 'Pazardzhik', postalCode: '4490' },
      { name: 'Batak', state: 'Pazardzhik', postalCode: '4580' },
      
      // Pernik region
      { name: 'Pernik', nameBg: 'Перник', state: 'Pernik', postalCode: '2300' },
      { name: 'Radomir', state: 'Pernik', postalCode: '2400' },
      { name: 'Breznik', state: 'Pernik', postalCode: '2360' },
      { name: 'Tran', state: 'Pernik', postalCode: '2460' },
      
      // Pleven region
      { name: 'Pleven', nameBg: 'Плевен', state: 'Pleven', postalCode: '5800' },
      { name: 'Levski', state: 'Pleven', postalCode: '5900' },
      { name: 'Cherven Bryag', state: 'Pleven', postalCode: '5980' },
      { name: 'Belene', state: 'Pleven', postalCode: '5930' },
      { name: 'Knezha', state: 'Pleven', postalCode: '5835' },
      
      // Plovdiv region
      { name: 'Plovdiv', nameBg: 'Пловдив', state: 'Plovdiv', postalCode: '4000' },
      { name: 'Asenovgrad', state: 'Plovdiv', postalCode: '4230' },
      { name: 'Karlovo', state: 'Plovdiv', postalCode: '4300' },
      { name: 'Sopot', state: 'Plovdiv', postalCode: '4330' },
      { name: 'Hisarya', state: 'Plovdiv', postalCode: '4180' },
      { name: 'Stamboliyski', nameBg: 'Стамболийски', state: 'Plovdiv', postalCode: '4210' },
      { name: 'Perushtitsa', nameBg: 'Перущица', state: 'Plovdiv', postalCode: '4225' },
      { name: 'Krichim', nameBg: 'Кричим', state: 'Plovdiv', postalCode: '4220' },
      { name: 'Rakovski', nameBg: 'Раковски', state: 'Plovdiv', postalCode: '4150' },
      { name: 'Brezovo', nameBg: 'Брезово', state: 'Plovdiv', postalCode: '4160' },
      { name: 'Sadovo', nameBg: 'Садово', state: 'Plovdiv', postalCode: '4122' },
      { name: 'Kaloyanovo', nameBg: 'Калояново', state: 'Plovdiv', postalCode: '4173' },
      { name: 'Saedinenie', nameBg: 'Съединение', state: 'Plovdiv', postalCode: '4190' },
      
      // Razgrad region
      { name: 'Razgrad', nameBg: 'Разград', state: 'Razgrad', postalCode: '7200' },
      { name: 'Isperih', state: 'Razgrad', postalCode: '7400' },
      { name: 'Kubrat', state: 'Razgrad', postalCode: '7300' },
      { name: 'Zavet', state: 'Razgrad', postalCode: '7330' },
      
      // Ruse region
      { name: 'Ruse', nameBg: 'Русе', state: 'Ruse', postalCode: '7000' },
      { name: 'Byala', state: 'Ruse', postalCode: '7100' },
      { name: 'Slivo Pole', state: 'Ruse', postalCode: '7060' },
      { name: 'Borovo', state: 'Ruse', postalCode: '7174' },
      { name: 'Dve Mogili', nameBg: 'Две Могили', state: 'Ruse', postalCode: '7150' },
      { name: 'Vetovo', nameBg: 'Ветово', state: 'Ruse', postalCode: '7080' },
      { name: 'Tsenovo', nameBg: 'Ценово', state: 'Ruse', postalCode: '7139' },
      { name: 'Ivanovo', nameBg: 'Иваново', state: 'Ruse', postalCode: '7088' },
      { name: 'Marten', nameBg: 'Мартен', state: 'Ruse', postalCode: '7040' },
      { name: 'Nikolovo', nameBg: 'Николово', state: 'Ruse', postalCode: '7057' },
      
      // Shumen region
      { name: 'Shumen', nameBg: 'Шумен', state: 'Shumen', postalCode: '9700' },
      { name: 'Novi Pazar', state: 'Shumen', postalCode: '9900' },
      { name: 'Veliki Preslav', state: 'Shumen', postalCode: '9850' },
      { name: 'Kaspichan', state: 'Shumen', postalCode: '9930' },
      
      // Silistra region
      { name: 'Silistra', nameBg: 'Силистра', state: 'Silistra', postalCode: '7500' },
      { name: 'Tutrakan', state: 'Silistra', postalCode: '7600' },
      { name: 'Dulovo', state: 'Silistra', postalCode: '7650' },
      { name: 'Glavinitsa', state: 'Silistra', postalCode: '7630' },
      
      // Sliven region
      { name: 'Sliven', nameBg: 'Сливен', state: 'Sliven', postalCode: '8800' },
      { name: 'Nova Zagora', state: 'Sliven', postalCode: '8900' },
      { name: 'Kotel', state: 'Sliven', postalCode: '8970' },
      { name: 'Tvarditsa', state: 'Sliven', postalCode: '8890' },
      
      // Smolyan region
      { name: 'Smolyan', nameBg: 'Смолян', state: 'Smolyan', postalCode: '4700' },
      { name: 'Chepelare', state: 'Smolyan', postalCode: '4850' },
      { name: 'Devin', state: 'Smolyan', postalCode: '4800' },
      { name: 'Zlatograd', state: 'Smolyan', postalCode: '4980' },
      { name: 'Madan', state: 'Smolyan', postalCode: '4900' },
      
      // Sofia-city region
      { name: 'Sofia', nameBg: 'София', state: 'Sofia-city', postalCode: '1000' },
      { name: 'Bankya', nameBg: 'Банкя', state: 'Sofia-city', postalCode: '1320' },
      { name: 'Novi Iskar', nameBg: 'Нови Искър', state: 'Sofia-city', postalCode: '1280' },
      { name: 'Bistritsa', nameBg: 'Бистрица', state: 'Sofia-city', postalCode: '1444' },
      { name: 'Pancharevo', nameBg: 'Панчарево', state: 'Sofia-city', postalCode: '1137' },
      { name: 'Boyana', nameBg: 'Бояна', state: 'Sofia-city', postalCode: '1616' },
      { name: 'Lozenets', nameBg: 'Лозенец', state: 'Sofia-city', postalCode: '1407' },
      { name: 'Mladost', nameBg: 'Младост', state: 'Sofia-city', postalCode: '1750' },
      { name: 'Lyulin', nameBg: 'Люлин', state: 'Sofia-city', postalCode: '1336' },
      { name: 'Druzhba', nameBg: 'Дружба', state: 'Sofia-city', postalCode: '1582' },
      { name: 'Iztok', nameBg: 'Изток', state: 'Sofia-city', postalCode: '1113' },
      { name: 'Manastirski Livadi', nameBg: 'Манастирски ливади', state: 'Sofia-city', postalCode: '1404' },
      
      // Sofia province region
      { name: 'Botevgrad', nameBg: 'Ботевград', state: 'Sofia-province', postalCode: '2140' },
      { name: 'Samokov', nameBg: 'Самоков', state: 'Sofia-province', postalCode: '2000' },
      { name: 'Svoge', nameBg: 'Своге', state: 'Sofia-province', postalCode: '2260' },
      { name: 'Kostinbrod', nameBg: 'Костинброд', state: 'Sofia-province', postalCode: '2230' },
      { name: 'Slivnitsa', nameBg: 'Сливница', state: 'Sofia-province', postalCode: '2200' },
      { name: 'Elin Pelin', nameBg: 'Елин Пелин', state: 'Sofia-province', postalCode: '2100' },
      { name: 'Pirdop', nameBg: 'Пирдоп', state: 'Sofia-province', postalCode: '2070' },
      { name: 'Etropole', nameBg: 'Етрополе', state: 'Sofia-province', postalCode: '2180' },
      { name: 'Buhovo', nameBg: 'Бухово', state: 'Sofia-province', postalCode: '1830' },
      { name: 'Pravets', nameBg: 'Правец', state: 'Sofia-province', postalCode: '2161' },
      { name: 'Zlatitsa', nameBg: 'Златица', state: 'Sofia-province', postalCode: '2080' },
      { name: 'Koprivshtitsa', nameBg: 'Копривщица', state: 'Sofia-province', postalCode: '2077' },
      { name: 'Dolna Banya', nameBg: 'Долна Баня', state: 'Sofia-province', postalCode: '2040' },
      { name: 'Bov', nameBg: 'Бов', state: 'Sofia-province', postalCode: '2270' },
      
      // Stara Zagora region
      { name: 'Stara Zagora', nameBg: 'Стара Загора', state: 'Stara Zagora', postalCode: '6000' },
      { name: 'Kazanlak', state: 'Stara Zagora', postalCode: '6100' },
      { name: 'Chirpan', state: 'Stara Zagora', postalCode: '6200' },
      { name: 'Radnevo', state: 'Stara Zagora', postalCode: '6260' },
      { name: 'Gurkovo', state: 'Stara Zagora', postalCode: '6199' },
      { name: 'Pavel Banya', state: 'Stara Zagora', postalCode: '6155' },
      
      // Targovishte region
      { name: 'Targovishte', nameBg: 'Търговище', state: 'Targovishte', postalCode: '7700' },
      { name: 'Popovo', state: 'Targovishte', postalCode: '7800' },
      { name: 'Omurtag', state: 'Targovishte', postalCode: '7900' },
      { name: 'Antonovo', state: 'Targovishte', postalCode: '7970' },
      
      // Varna region
      { name: 'Varna', nameBg: 'Варна', state: 'Varna', postalCode: '9000' },
      { name: 'Byala', nameBg: 'Бяла', state: 'Varna', postalCode: '9101' },
      { name: 'Golden Sands', nameBg: 'Златни пясъци', state: 'Varna', postalCode: '9007' },
      { name: 'Provadia', nameBg: 'Провадия', state: 'Varna', postalCode: '9200' },
      { name: 'Devnya', nameBg: 'Девня', state: 'Varna', postalCode: '9160' },
      { name: 'Aksakovo', nameBg: 'Аксаково', state: 'Varna', postalCode: '9154' },
      { name: 'Sv. Sv. Konstantin i Elena', nameBg: 'Св. Св. Константин и Елена', state: 'Varna', postalCode: '9006' },
      { name: 'Kavarna', nameBg: 'Каварна', state: 'Varna', postalCode: '9650' },
      { name: 'Kranevo', nameBg: 'Кранево', state: 'Varna', postalCode: '9649' },
      { name: 'Shkorpilovtsi', nameBg: 'Шкорпиловци', state: 'Varna', postalCode: '9110' },
      { name: 'Kazashko', nameBg: 'Казашко', state: 'Varna', postalCode: '9023' },
      { name: 'Asparuhovo', nameBg: 'Аспарухово', state: 'Varna', postalCode: '9003' },
      { name: 'Dolni Chiflik', nameBg: 'Долни Чифлик', state: 'Varna', postalCode: '9120' },
      { name: 'Dalgopol', nameBg: 'Дългопол', state: 'Varna', postalCode: '9250' },
      { name: 'Suvorovo', nameBg: 'Суворово', state: 'Varna', postalCode: '9170' },
      { name: 'Avren', nameBg: 'Аврен', state: 'Varna', postalCode: '9135' },
      { name: 'Beloslav', nameBg: 'Белослав', state: 'Varna', postalCode: '9178' },
      { name: 'Zvezditsa', nameBg: 'Звездица', state: 'Varna', postalCode: '9040' },
      { name: 'Kamenar', nameBg: 'Каменар', state: 'Varna', postalCode: '9010' },
      { name: 'Topoli', nameBg: 'Тополи', state: 'Varna', postalCode: '9109' },
      
      // Veliko Tarnovo region
      { name: 'Veliko Tarnovo', nameBg: 'Велико Търново', state: 'Veliko Tarnovo', postalCode: '5000' },
      { name: 'Gorna Oryahovitsa', state: 'Veliko Tarnovo', postalCode: '5100' },
      { name: 'Svishtov', state: 'Veliko Tarnovo', postalCode: '5250' },
      { name: 'Pavlikeni', state: 'Veliko Tarnovo', postalCode: '5200' },
      { name: 'Elena', state: 'Veliko Tarnovo', postalCode: '5070' },
      { name: 'Lyaskovets', state: 'Veliko Tarnovo', postalCode: '5140' },
      { name: 'Polski Trambesh', nameBg: 'Полски Тръмбеш', state: 'Veliko Tarnovo', postalCode: '5180' },
      { name: 'Strazhitsa', nameBg: 'Стражица', state: 'Veliko Tarnovo', postalCode: '5150' },
      { name: 'Zlataritsa', nameBg: 'Златарица', state: 'Veliko Tarnovo', postalCode: '5090' },
      { name: 'Suhindol', nameBg: 'Сухиндол', state: 'Veliko Tarnovo', postalCode: '5240' },
      { name: 'Byala Cherkva', nameBg: 'Бяла Черква', state: 'Veliko Tarnovo', postalCode: '5220' },
      { name: 'Debelets', nameBg: 'Дебелец', state: 'Veliko Tarnovo', postalCode: '5030' },
      { name: 'Kilifarevo', nameBg: 'Килифарево', state: 'Veliko Tarnovo', postalCode: '5050' },
      { name: 'Dolna Oryahovitsa', nameBg: 'Долна Оряховица', state: 'Veliko Tarnovo', postalCode: '5130' },
      
      // Vidin region
      { name: 'Vidin', nameBg: 'Видин', state: 'Vidin', postalCode: '3700' },
      { name: 'Belogradchik', state: 'Vidin', postalCode: '3900' },
      { name: 'Kula', state: 'Vidin', postalCode: '3800' },
      { name: 'Dunavtsi', state: 'Vidin', postalCode: '3820' },
      
      // Vratsa region
      { name: 'Vratsa', nameBg: 'Враца', state: 'Vratsa', postalCode: '3000' },
      { name: 'Mezdra', state: 'Vratsa', postalCode: '3100' },
      { name: 'Kozloduy', state: 'Vratsa', postalCode: '3320' },
      { name: 'Byala Slatina', state: 'Vratsa', postalCode: '3200' },
      { name: 'Oryahovo', state: 'Vratsa', postalCode: '3300' },
      
      // Yambol region
      { name: 'Yambol', nameBg: 'Ямбол', state: 'Yambol', postalCode: '8600' },
      { name: 'Elhovo', state: 'Yambol', postalCode: '8700' },
      { name: 'Straldzha', state: 'Yambol', postalCode: '8680' },
      { name: 'Bolyarovo', state: 'Yambol', postalCode: '8720' }
    ];

    // Process each city with the correct state ID
    console.log('Creating/updating city data...');
    for (const cityData of citiesData) {
      // Find the state ID by name
      const state = createdStates.find(s => s.name === cityData.state);
      if (!state) {
        console.warn(`State ${cityData.state} not found, skipping city ${cityData.name}`);
        continue;
      }

      const city = await prisma.$queryRaw`
        INSERT INTO "City" ("name", "nameBg", "stateId", "postalCode", "createdAt", "updatedAt")
        VALUES (${cityData.name}, ${cityData.nameBg}, ${state.id}, ${cityData.postalCode}, NOW(), NOW())
        ON CONFLICT ("name", "stateId") DO UPDATE
        SET "postalCode" = ${cityData.postalCode}, 
            "nameBg" = ${cityData.nameBg},
            "updatedAt" = NOW()
        RETURNING *
      `;
      
      const cityObj = Array.isArray(city) ? city[0] : city;
      console.log(`City created: ${cityObj.name} with postal code ${cityObj.postalCode}`);
    }

    console.log('Location data seeded successfully');
  } catch (error) {
    console.error('Error seeding location data:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Failed to seed location data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  }); 