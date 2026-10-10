/* T634：英式住商工候選；108 款明列。座標為真實一格，純繪圖、不寫入 bd／存檔、不取亂數。 */
/* m 每項：[u,v,du,dv,簷高,樓層,材料,屋頂,細節]；每款的量體、屋脊、退台與庭院皆明示。 */
const RCI_CATALOG634={
  '1_1_0':{name:'紅磚工人連排屋',archetype:'three-bay-workers-terrace',yard:'rail',m:[[.12,.18,.25,.57,21,2,'brick','gable','door'],[.37,.18,.25,.57,21,2,'brick','gable','door'],[.62,.18,.25,.57,21,2,'brick','gable','door']]},
  '1_1_1':{name:'凸窗半獨立住宅',archetype:'bay-fronted-semi-detached',yard:'garden',m:[[.13,.18,.34,.56,26,2,'brick','gable','bay porch'],[.49,.18,.34,.56,26,2,'brick','gable','bay porch']]},
  '1_1_2':{name:'都鐸木構小屋',archetype:'tudor-cross-wing-cottage',yard:'garden',m:[[.18,.15,.52,.43,24,2,'tudor','gable','door'],[.55,.42,.25,.37,19,1,'tudor','gable','porch']]},
  '1_1_3':{name:'科茨沃爾德石屋',archetype:'cotswold-stone-cottage',yard:'wall',m:[[.18,.20,.63,.51,21,2,'stone','gable','dormer porch']]},
  '1_1_4':{name:'喬治式雙聯排屋',archetype:'georgian-paired-townhouses',yard:'rail',m:[[.16,.16,.32,.64,32,3,'stock','flat','door pediment'],[.49,.16,.32,.64,32,3,'stock','flat','door pediment']]},
  '1_1_5':{name:'花園郊區坡頂屋',archetype:'garden-suburb-hipped-house',yard:'garden',m:[[.17,.18,.61,.50,23,2,'render','hip','bay'],[.52,.62,.19,.19,10,0,'brick','gable','door']]},
  '1_1_6':{name:'威爾斯礦工連排屋',archetype:'welsh-miners-four-cottages',yard:'wall',m:[[.10,.23,.20,.54,17,1,'stone','gable','door'],[.30,.23,.20,.54,17,1,'stone','gable','door'],[.50,.23,.20,.54,17,1,'stone','gable','door'],[.70,.23,.20,.54,17,1,'stone','gable','door']]},
  '1_1_7':{name:'蘇格蘭砂岩雙戶屋',archetype:'scottish-sandstone-double-villa',yard:'rail',m:[[.14,.17,.73,.58,29,2,'sandstone','hip','bay door']]},
  '1_1_8':{name:'肯特白木板小屋',archetype:'kent-weatherboard-cottage',yard:'garden',m:[[.21,.17,.47,.57,22,2,'weatherboard','gable','porch'],[.66,.39,.17,.27,12,1,'brick','lean','door']]},
  '1_1_9':{name:'維多利亞別墅',archetype:'victorian-villa-rear-wing',yard:'garden',m:[[.21,.12,.29,.35,20,2,'brick','gable',''],[.14,.35,.61,.39,32,3,'brick','hip','bay pediment']]},
  '1_1_10':{name:'馬廄改建庭院屋',archetype:'stable-conversion-l-court',yard:'court',m:[[.14,.15,.69,.26,20,2,'stock','gable','arch'],[.14,.41,.26,.41,20,2,'stock','gable','door']]},
  '1_1_11':{name:'愛德華街角尖塔屋',archetype:'edwardian-corner-villa-turret',yard:'rail',m:[[.18,.15,.56,.58,29,2,'brick','hip','bay'],[.64,.62,.19,.19,35,3,'render','spire','door']]},
  '1_2_0':{name:'倫敦蝶形屋頂排屋',archetype:'london-butterfly-roof-terrace',yard:'rail',m:[[.11,.13,.26,.67,38,3,'stock','butterfly','door'],[.37,.13,.26,.67,38,3,'stock','butterfly','door'],[.63,.13,.26,.67,38,3,'stock','butterfly','door']]},
  '1_2_1':{name:'愛德華凸窗連排屋',archetype:'edwardian-triple-bay-terrace',yard:'rail',m:[[.10,.14,.27,.62,37,3,'brick','gable','bay'],[.37,.14,.27,.62,40,3,'brick','gable','bay'],[.64,.14,.26,.62,37,3,'brick','gable','bay']]},
  '1_2_2':{name:'約克郡石砌街屋',archetype:'yorkshire-stone-terrace',yard:'wall',m:[[.12,.15,.76,.65,37,3,'stone','gable','doors dormer']]},
  '1_2_3':{name:'都鐸復興雙山牆住宅',archetype:'tudor-revival-twin-gables',yard:'garden',m:[[.12,.13,.35,.65,37,3,'tudor','gable','bay'],[.51,.13,.35,.65,37,3,'tudor','gable','bay']]},
  '1_2_4':{name:'喬治式粉飾錯落排屋',archetype:'georgian-stucco-stepped-terrace',yard:'rail',m:[[.10,.12,.25,.64,42,4,'stucco','flat','pediment'],[.35,.17,.30,.64,44,4,'stucco','flat','pediment'],[.65,.22,.25,.64,42,4,'stucco','flat','pediment']]},
  '1_2_5':{name:'維多利亞庭院公寓',archetype:'victorian-l-plan-courtyard-flats',yard:'court',m:[[.12,.12,.76,.29,45,4,'brick','mansard','dormer'],[.12,.41,.31,.43,42,4,'brick','gable','door']]},
  '1_2_6':{name:'格拉斯哥砂岩公寓',archetype:'glasgow-sandstone-tenement',yard:'rail',m:[[.13,.13,.75,.67,48,4,'sandstone','hip','bay doors dormer']]},
  '1_2_7':{name:'安妮女王式宅邸公寓',archetype:'queen-anne-gabled-mansion-flats',yard:'garden',m:[[.15,.12,.71,.49,46,4,'brick','hip','dormer'],[.23,.56,.23,.26,49,4,'brick','gable','bay'],[.62,.56,.21,.26,49,4,'brick','gable','bay']]},
  '1_2_8':{name:'工藝美術庭院住宅',archetype:'arts-and-crafts-courtyard',yard:'garden',m:[[.13,.13,.30,.69,37,3,'render','gable','tudor'],[.46,.13,.38,.41,34,3,'brick','hip','bay']]},
  '1_2_9':{name:'花園廣場端部排屋',archetype:'garden-square-end-terrace',yard:'rail',m:[[.17,.12,.61,.69,49,4,'stucco','mansard','bay dormer pediment']]},
  '1_2_10':{name:'倫敦馬廄巷複式住宅',archetype:'london-mews-maisonettes',yard:'court',m:[[.13,.20,.36,.59,32,3,'stock','gable','arch'],[.51,.20,.36,.59,35,3,'brick','gable','arch']]},
  '1_2_11':{name:'愛德華轉角公寓',archetype:'edwardian-turret-corner-tenement',yard:'rail',m:[[.14,.13,.70,.59,46,4,'brick','hip','bay dormer'],[.65,.65,.21,.21,57,5,'sandstone','spire','door']]},
  '1_3_0':{name:'倫敦紅磚宅邸公寓',archetype:'london-redbrick-mansion-block',yard:'rail',m:[[.10,.12,.80,.65,66,6,'brick','mansard','bay dormer pediment']]},
  '1_3_1':{name:'格拉斯哥街角高密公寓',archetype:'glasgow-l-plan-tenement-block',yard:'court',m:[[.10,.11,.78,.32,65,6,'sandstone','hip','dormer'],[.10,.43,.35,.43,62,5,'sandstone','hip','bay']]},
  '1_3_2':{name:'維多利亞周邊式庭院公寓',archetype:'victorian-u-court-housing',yard:'court',m:[[.10,.10,.78,.25,67,6,'stock','gable',''],[.10,.35,.24,.49,61,5,'brick','gable','bay'],[.65,.35,.23,.49,64,6,'brick','gable','bay']]},
  '1_3_3':{name:'愛德華尖塔宅邸街廓',archetype:'edwardian-corner-turret-mansions',yard:'rail',m:[[.12,.11,.72,.61,70,6,'brick','hip','bay dormer'],[.64,.66,.23,.23,83,7,'sandstone','spire','door']]},
  '1_3_4':{name:'喬治式都市高排屋',archetype:'georgian-tall-urban-terrace',yard:'rail',m:[[.09,.11,.28,.73,57,5,'stock','mansard','dormer'],[.37,.11,.27,.73,65,6,'stucco','flat','pediment'],[.64,.11,.27,.73,61,5,'stock','mansard','dormer']]},
  '1_3_5':{name:'安妮女王多山牆公寓',archetype:'queen-anne-three-gable-mansions',yard:'rail',m:[[.11,.12,.77,.45,68,6,'brick','hip','dormer'],[.14,.54,.22,.27,72,6,'brick','gable','bay'],[.40,.54,.22,.27,75,6,'brick','gable','bay'],[.66,.54,.20,.27,72,6,'brick','gable','bay']]},
  '1_3_6':{name:'維多利亞倉庫改建公寓',archetype:'victorian-warehouse-loft-conversion',yard:'court',m:[[.10,.11,.80,.70,74,6,'stock','saw','mill doors']]},
  '1_3_7':{name:'三十年代裝飾藝術公寓',archetype:'interwar-art-deco-stepped-flats',yard:'rail',m:[[.12,.12,.76,.69,57,5,'deco','flat','bay'],[.28,.18,.43,.38,77,7,'deco','flat','door']]},
  '1_3_8':{name:'波特蘭石高層宅邸',archetype:'portland-stone-mansard-mansions',yard:'rail',m:[[.15,.13,.70,.65,82,7,'stucco','mansard','bay dormer pediment']]},
  '1_3_9':{name:'維多利亞哥德式公寓',archetype:'victorian-gothic-mansion-flats',yard:'wall',m:[[.14,.11,.70,.62,71,6,'gothic','gable','bay'],[.24,.61,.21,.22,79,7,'gothic','gable','door'],[.62,.61,.19,.22,76,6,'gothic','gable','door']]},
  '1_3_10':{name:'愛德華四合院宅邸',archetype:'edwardian-quadrangle-mansion-flats',yard:'court',m:[[.10,.10,.79,.23,66,6,'brick','hip',''],[.10,.33,.23,.53,64,6,'brick','hip',''],[.66,.33,.23,.53,69,6,'brick','hip','bay'],[.33,.66,.33,.20,48,4,'stock','flat','arch']]},
  '1_3_11':{name:'北部工業城密集街廓',archetype:'northern-stepped-urban-tenements',yard:'rail',m:[[.10,.12,.26,.70,59,5,'brick','gable','bay'],[.36,.12,.27,.70,67,6,'stock','mansard','dormer'],[.63,.12,.27,.70,75,7,'brick','hip','bay']]},
  '2_1_0':{name:'高街麵包店',archetype:'high-street-paired-bakery',yard:'pave',m:[[.14,.17,.34,.60,23,2,'stock','gable','shop:BAKE'],[.50,.17,.33,.60,26,2,'brick','gable','shop:TEA']]},
  '2_1_1':{name:'街角肉舖',archetype:'corner-butcher-shop',yard:'pave',m:[[.16,.18,.69,.59,25,2,'brick','hip','shop:MEAT bay']]},
  '2_1_2':{name:'都鐸驛站旅店',archetype:'tudor-coaching-inn',yard:'court',m:[[.13,.13,.70,.30,28,2,'tudor','gable',''],[.13,.43,.37,.39,30,2,'tudor','gable','shop:INN arch']]},
  '2_1_3':{name:'炸魚薯條小店',archetype:'fish-and-chip-shop-rear-shed',yard:'pave',m:[[.22,.13,.47,.28,12,1,'stock','lean','loading'],[.16,.39,.66,.40,23,2,'render','gable','shop:FISH awning']]},
  '2_1_4':{name:'紅獅鄰里酒館',archetype:'red-lion-corner-public-house',yard:'pub',m:[[.14,.16,.64,.49,30,2,'brick','hip','shop:ALE'],[.60,.55,.23,.27,26,2,'tudor','gable','shop:INN']]},
  '2_1_5':{name:'石砌小鎮銀行',archetype:'stone-pediment-town-bank',yard:'pave',m:[[.19,.17,.62,.59,28,2,'stone','hip','bank pediment']]},
  '2_1_6':{name:'三山牆集市店屋',archetype:'triple-gable-market-shops',yard:'market',m:[[.12,.17,.25,.54,21,2,'brick','gable','shop:TEA'],[.37,.17,.26,.54,23,2,'stock','gable','shop:SHOP'],[.63,.17,.25,.54,21,2,'brick','gable','shop:ALE']]},
  '2_1_7':{name:'窄面文具書店',archetype:'narrow-stationer-townhouse',yard:'pave',m:[[.25,.12,.46,.68,34,3,'stock','mansard','shop:BOOK dormer']]},
  '2_1_8':{name:'高街蔬果店',archetype:'greengrocer-awning-shop',yard:'produce',m:[[.16,.18,.68,.58,26,2,'brick','gable','shop:FOOD awning']]},
  '2_1_9':{name:'石屋茶室',archetype:'village-stone-tearoom',yard:'pub',m:[[.17,.16,.60,.37,24,2,'stone','gable','shop:TEA'],[.17,.53,.26,.26,18,1,'stone','hip','shop:TEA']]},
  '2_1_10':{name:'維多利亞凸窗古董店',archetype:'victorian-bay-front-antique-shop',yard:'pave',m:[[.21,.14,.59,.64,32,3,'brick','hip','shop:OLD bay']]},
  '2_1_11':{name:'紅磚街角郵局',archetype:'corner-sub-post-office',yard:'post',m:[[.13,.19,.74,.58,29,2,'brick','gable','shop:POST pediment']]},
  '2_2_0':{name:'維多利亞高街商店排屋',archetype:'victorian-mixed-height-shop-parade',yard:'pave',m:[[.09,.14,.28,.65,39,3,'brick','gable','shop:BAKE'],[.37,.14,.28,.65,45,4,'stock','mansard','shop:BOOK dormer'],[.65,.14,.26,.65,41,3,'brick','hip','shop:TEA']]},
  '2_2_1':{name:'愛德華石砌銀行',archetype:'edwardian-bank-cupola',yard:'pave',m:[[.13,.13,.74,.66,43,3,'sandstone','hip','bank pediment'],[.39,.33,.23,.23,59,4,'stone','spire','clock']]},
  '2_2_2':{name:'倫敦玻璃拱廊商場',archetype:'london-covered-shopping-arcade',yard:'court',m:[[.10,.14,.25,.68,41,3,'brick','mansard','shop:SHOP'],[.36,.15,.29,.66,24,1,'stone','glass','arcade'],[.66,.14,.24,.68,44,4,'brick','mansard','shop:TEA']]},
  '2_2_3':{name:'維多利亞街角百貨',archetype:'victorian-corner-department-store',yard:'pave',m:[[.12,.12,.74,.64,47,4,'stock','mansard','shop:STORE'],[.65,.66,.22,.22,59,5,'brick','hip','clock']]},
  '2_2_4':{name:'鐘樓集市大廳',archetype:'clock-tower-covered-market',yard:'market',m:[[.12,.12,.76,.56,29,2,'brick','glass','arcade'],[.37,.65,.26,.21,46,3,'stone','hip','clock arch']]},
  '2_2_5':{name:'喬治式驛站酒店',archetype:'georgian-coaching-hotel-court',yard:'court',m:[[.12,.11,.74,.31,46,4,'stock','hip','dormer'],[.12,.42,.33,.40,43,4,'stock','hip','shop:HOTEL arch']]},
  '2_2_6':{name:'都鐸復興高街商樓',archetype:'tudor-revival-three-gable-shops',yard:'pave',m:[[.10,.14,.26,.64,37,3,'tudor','gable','shop:ALE'],[.37,.14,.27,.64,42,3,'tudor','gable','shop:INN'],[.65,.14,.25,.64,37,3,'tudor','gable','shop:TEA']]},
  '2_2_7':{name:'喬治式辦公事務所',archetype:'georgian-mansard-office-chambers',yard:'rail',m:[[.16,.12,.68,.67,48,4,'stucco','mansard','pediment dormer']]},
  '2_2_8':{name:'鐵路街角旅館',archetype:'railway-hotel-turret-corner',yard:'pave',m:[[.11,.13,.75,.61,49,4,'brick','hip','shop:HOTEL dormer'],[.65,.66,.23,.22,63,5,'sandstone','spire','clock']]},
  '2_2_9':{name:'海濱玻璃櫥窗商廊',archetype:'seaside-cast-iron-shop-gallery',yard:'pave',m:[[.12,.14,.76,.65,41,3,'render','hip','shop:SHOP balcony awning']]},
  '2_2_10':{name:'合作社百貨商樓',archetype:'cooperative-emporium-gabled',yard:'pave',m:[[.13,.13,.74,.58,44,4,'brick','flat','shop:COOP'],[.30,.56,.40,.25,48,4,'stone','gable','shop:COOP']]},
  '2_2_11':{name:'運河倉庫辦公樓',archetype:'canal-warehouse-office-conversion',yard:'court',m:[[.13,.12,.74,.69,51,4,'stock','flat','mill shop:WORK crane']]},
  '2_3_0':{name:'波特蘭石旗艦百貨',archetype:'portland-stone-grand-department-store',yard:'pave',m:[[.11,.12,.78,.69,69,6,'stucco','mansard','shop:STORE pediment dormer']]},
  '2_3_1':{name:'愛德華保險會社大樓',archetype:'edwardian-insurance-chambers-tower',yard:'pave',m:[[.11,.12,.75,.62,76,6,'sandstone','hip','bank'],[.65,.66,.23,.23,92,8,'stone','spire','clock']]},
  '2_3_2':{name:'維多利亞有頂交易所',archetype:'victorian-covered-commercial-exchange',yard:'court',m:[[.10,.10,.25,.75,65,5,'brick','mansard','shop:WORK'],[.35,.16,.30,.57,37,2,'stone','glass','arcade'],[.65,.10,.25,.75,72,6,'brick','mansard','shop:WORK']]},
  '2_3_3':{name:'裝飾藝術百貨大樓',archetype:'art-deco-stepped-department-store',yard:'pave',m:[[.10,.12,.80,.70,60,5,'deco','flat','shop:STORE'],[.27,.20,.47,.39,81,7,'deco','flat','clock']]},
  '2_3_4':{name:'哥德復興銀行總部',archetype:'gothic-revival-bank-headquarters',yard:'pave',m:[[.15,.12,.70,.67,73,6,'gothic','gable','bank'],[.17,.65,.18,.21,86,7,'gothic','spire',''],[.67,.65,.17,.21,86,7,'gothic','spire','']]},
  '2_3_5':{name:'喬治式庭院大酒店',archetype:'georgian-courtyard-grand-hotel',yard:'court',m:[[.10,.10,.79,.26,68,6,'stucco','mansard','dormer'],[.10,.36,.25,.47,63,5,'stucco','hip','shop:HOTEL'],[.65,.36,.24,.47,66,6,'stucco','hip','shop:HOTEL']]},
  '2_3_6':{name:'都市維多利亞商業街廓',archetype:'victorian-tall-high-street-block',yard:'pave',m:[[.08,.13,.28,.69,59,5,'brick','gable','shop:BAKE'],[.36,.13,.29,.69,69,6,'stock','mansard','shop:STORE dormer'],[.65,.13,.27,.69,64,5,'brick','hip','shop:BOOK']]},
  '2_3_7':{name:'愛德華玻璃購物拱廊',archetype:'edwardian-grand-shopping-arcade',yard:'pave',m:[[.12,.10,.75,.25,75,6,'sandstone','mansard','dormer'],[.13,.35,.23,.46,62,5,'brick','hip','shop:SHOP'],[.36,.35,.29,.47,36,2,'stone','glass','arcade'],[.65,.35,.22,.46,64,5,'brick','hip','shop:TEA']]},
  '2_3_8':{name:'北部紡織交易所',archetype:'northern-textile-exchange-clock-tower',yard:'pave',m:[[.11,.13,.78,.66,77,6,'sandstone','mansard','bank dormer'],[.38,.58,.24,.27,98,8,'stone','hip','clock arch']]},
  '2_3_9':{name:'紅磚市場與商務大樓',archetype:'redbrick-market-and-office-block',yard:'market',m:[[.11,.12,.77,.28,73,6,'brick','gable','mill'],[.12,.40,.76,.38,42,3,'brick','glass','arcade shop:SHOP']]},
  '2_3_10':{name:'英式鐵路大酒店',archetype:'british-grand-railway-hotel',yard:'pave',m:[[.12,.13,.76,.61,84,7,'brick','mansard','shop:HOTEL dormer'],[.18,.66,.22,.22,97,8,'sandstone','spire','clock'],[.66,.66,.19,.21,91,8,'brick','spire','']]},
  '2_3_11':{name:'兩戰間石砌辦公大樓',archetype:'interwar-stone-stepped-office-block',yard:'pave',m:[[.14,.12,.72,.68,87,8,'stone','flat','bank'],[.29,.24,.43,.35,101,9,'stone','flat','pediment']]},
  '3_1_0':{name:'木匠作坊',archetype:'joiners-gabled-workshop',yard:'timber',m:[[.14,.14,.66,.52,18,1,'brick','gable','loading']]},
  '3_1_1':{name:'小鎮鐵匠鋪',archetype:'blacksmith-l-plan-forge',yard:'forge',m:[[.14,.15,.55,.36,22,2,'brick','gable','mill'],[.14,.51,.31,.29,16,1,'brick','lean','loading']]},
  '3_1_2':{name:'北向天窗鋸木廠',archetype:'northlight-sawmill',yard:'logs',m:[[.12,.15,.77,.42,20,1,'weatherboard','saw','loading']]},
  '3_1_3':{name:'小型磚窯場',archetype:'small-brickyard-kiln',yard:'bricks',m:[[.14,.14,.44,.49,20,1,'brick','hip','loading']]},
  '3_1_4':{name:'鄰里織布作坊',archetype:'weavers-three-storey-workshop',yard:'pave',m:[[.16,.15,.66,.60,31,3,'stock','gable','mill loading']]},
  '3_1_5':{name:'運河裝卸小倉庫',archetype:'canal-hoist-warehouse',yard:'crates',m:[[.20,.13,.53,.65,32,3,'brick','gable','mill crane loading']]},
  '3_1_6':{name:'牛奶處理工坊',archetype:'small-dairy-processing-workshop',yard:'dairy',m:[[.15,.16,.56,.57,23,2,'render','hip','mill loading']]},
  '3_1_7':{name:'拱門修車工坊',archetype:'twin-bay-motor-works',yard:'garage',m:[[.13,.17,.73,.61,24,1,'brick','barrel','loading arch']]},
  '3_1_8':{name:'史托克陶器工坊',archetype:'stoke-pottery-bottle-kiln',yard:'pottery',m:[[.12,.13,.50,.52,24,2,'brick','gable','mill loading']]},
  '3_1_9':{name:'石匠切石作坊',archetype:'stonemasons-open-yard',yard:'stoneworks',m:[[.14,.15,.46,.40,20,1,'stone','lean','loading']]},
  '3_1_10':{name:'煤商堆料場',archetype:'coal-merchants-yard',yard:'coal',m:[[.12,.13,.50,.47,20,1,'brick','gable','loading'],[.67,.18,.20,.25,12,1,'weatherboard','lean','door']]},
  '3_1_11':{name:'雙山牆印刷工坊',archetype:'twin-gable-printing-workshop',yard:'crates',m:[[.12,.15,.36,.62,29,2,'stock','gable','mill loading'],[.50,.15,.36,.62,32,3,'brick','gable','mill loading']]},
  '3_2_0':{name:'蘭開夏紡織廠',archetype:'lancashire-four-storey-textile-mill',yard:'mill',m:[[.12,.12,.76,.68,46,4,'brick','gable','mill loading']]},
  '3_2_1':{name:'黑鄉鐵鑄造廠',archetype:'black-country-iron-foundry',yard:'foundry',m:[[.11,.14,.77,.56,33,2,'brick','barrel','mill loading'],[.13,.66,.25,.18,19,1,'brick','lean','loading']]},
  '3_2_2':{name:'北向天窗機械工廠',archetype:'northlight-engineering-works',yard:'engineering',m:[[.11,.12,.76,.59,30,2,'brick','saw','mill loading'],[.64,.64,.24,.23,43,4,'stock','flat','door']]},
  '3_2_3':{name:'雙窯磚瓦工廠',archetype:'twin-kiln-brickworks',yard:'doublekiln',m:[[.12,.13,.75,.29,26,2,'brick','gable','mill loading']]},
  '3_2_4':{name:'維多利亞啤酒廠',archetype:'victorian-brewery-maltings',yard:'brewery',m:[[.12,.12,.53,.60,44,4,'stock','gable','mill'],[.67,.15,.22,.42,31,2,'brick','hip','loading']]},
  '3_2_5':{name:'雙跨鐵路貨運庫',archetype:'twin-span-railway-goods-depot',yard:'depot',m:[[.10,.15,.38,.61,31,1,'brick','barrel','loading'],[.50,.15,.39,.61,35,2,'brick','barrel','loading']]},
  '3_2_6':{name:'長形繩索工廠',archetype:'long-ropewalk-factory',yard:'timber',m:[[.10,.13,.80,.28,39,3,'stock','gable','mill'],[.15,.47,.72,.24,21,1,'weatherboard','lean','loading']]},
  '3_2_7':{name:'造紙廠與水箱',archetype:'paper-mill-water-tank',yard:'paper',m:[[.12,.14,.64,.54,37,3,'brick','saw','mill loading']]},
  '3_2_8':{name:'約克郡毛紡織廠',archetype:'yorkshire-l-plan-woollen-mill',yard:'mill',m:[[.10,.12,.76,.28,45,4,'stone','gable','mill'],[.10,.40,.32,.42,40,3,'stone','gable','mill loading']]},
  '3_2_9':{name:'皮革加工工廠',archetype:'tannery-courtyard-works',yard:'tannery',m:[[.12,.13,.51,.65,36,3,'stock','gable','mill loading']]},
  '3_2_10':{name:'電機製造工廠',archetype:'edwardian-electrical-manufacturing-works',yard:'engineering',m:[[.12,.13,.75,.63,47,4,'brick','flat','mill loading'],[.19,.63,.24,.20,54,4,'stone','flat','clock']]},
  '3_2_11':{name:'運河穀物倉庫',archetype:'canal-grain-hoist-warehouse',yard:'crates',m:[[.16,.11,.68,.71,52,5,'stock','gable','mill crane loading']]},
  '3_3_0':{name:'蘭開夏大型棉紡廠',archetype:'lancashire-cotton-mill-chimney',yard:'tallmill',m:[[.09,.11,.80,.71,73,7,'brick','flat','mill loading']]},
  '3_3_1':{name:'重型機械製造廠',archetype:'heavy-engineering-northlight-complex',yard:'heavy',m:[[.10,.12,.79,.58,43,3,'brick','saw','mill loading'],[.66,.64,.22,.22,83,7,'stock','flat','clock']]},
  '3_3_2':{name:'維多利亞鐘樓工業街廓',archetype:'victorian-clock-tower-industrial-complex',yard:'engineering',m:[[.11,.12,.76,.31,64,5,'brick','gable','mill'],[.12,.43,.32,.39,45,4,'stock','saw','mill loading'],[.65,.57,.22,.25,91,8,'brick','hip','clock']]},
  '3_3_3':{name:'城市大型釀酒廠',archetype:'urban-brewery-malt-house-complex',yard:'bigbrewery',m:[[.10,.11,.60,.59,66,6,'stock','mansard','mill dormer'],[.65,.46,.23,.33,33,2,'brick','hip','loading']]},
  '3_3_4':{name:'密集織布與紡紗工廠',archetype:'textile-spinning-and-weaving-mill',yard:'tallmill',m:[[.10,.10,.79,.28,63,6,'brick','flat','mill'],[.10,.39,.79,.40,34,2,'brick','saw','mill loading']]},
  '3_3_5':{name:'渦輪機械製造大廳',archetype:'turbine-engineering-hall',yard:'powerworks',m:[[.13,.12,.62,.62,62,4,'brick','barrel','mill loading'],[.64,.62,.23,.23,79,6,'stone','flat','clock']]},
  '3_3_6':{name:'鋼鐵鑄造與橋式吊車廠',archetype:'steel-foundry-gantry-works',yard:'gantry',m:[[.11,.12,.76,.56,47,3,'brick','saw','mill loading'],[.12,.66,.26,.18,31,2,'stock','flat','mill']]},
  '3_3_7':{name:'運河雙排保稅倉庫',archetype:'paired-canal-bonded-warehouses',yard:'crates',m:[[.10,.11,.35,.72,73,7,'stock','gable','mill crane loading'],[.55,.11,.35,.72,66,6,'brick','gable','mill crane loading']]},
  '3_3_8':{name:'大型報業印刷工廠',archetype:'metropolitan-newspaper-printing-works',yard:'engineering',m:[[.11,.12,.77,.68,70,6,'brick','flat','mill loading'],[.19,.60,.24,.23,84,7,'stone','flat','clock']]},
  '3_3_9':{name:'機車與車廂製造工廠',archetype:'locomotive-and-carriage-works',yard:'depot',m:[[.10,.12,.80,.51,49,3,'brick','saw','mill loading'],[.12,.65,.31,.20,69,6,'stock','hip','mill'],[.51,.65,.37,.20,26,1,'brick','barrel','loading']]},
  '3_3_10':{name:'大型麵粉磨坊',archetype:'industrial-flour-mill-silos',yard:'flour',m:[[.11,.11,.63,.64,79,7,'stock','gable','mill crane loading']]},
  '3_3_11':{name:'北部高塔機械工業廠',archetype:'northern-tower-engineering-works',yard:'towerworks',m:[[.12,.12,.49,.62,93,8,'brick','flat','mill clock'],[.61,.20,.27,.54,56,4,'stock','saw','mill loading']]}
};
/* 立面所有實體筆畫先清夜層；玻璃只把真正窗洞寫入夜層，後來量體可正常遮擋。 */
function rciPainter634(T){
  const K=kit634(T),{P,quad,g,ng,poly,box}=T,W=T.winter,we=T.k===1?(T.we===undefined?1:T.we):1;
  const mat={brick:'#ac715a',stock:'#b4a080',stone:'#b9ad94',sandstone:'#c0a17e',render:'#d1c7ae',stucco:'#dcd5c2',weatherboard:'#c9c3ad',tudor:'#d6c8aa',deco:'#d0cbb8',gothic:'#a57760'};
  const roof=W?'#e7ece8':'#465760',roofDark=W?'#cbd8d3':'#35464f',trim=we===2?'#ede0c7':we===0?'#c5b89d':'#dfcfad';
  const glass=(ps,c='#587481',lit='#f5d59a')=>{K.face(ps,c);ng.save();ng.globalCompositeOperation='source-over';poly(ng,ps,lit);ng.restore();};
  const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const plate=(u,v,du,dv,z,col)=>K.face(quad(u,v,du,dv,z),col);
  const stack=(u,v,h,width=.075,smoke=true)=>{
    box(u,v,width,width,h,{left:'#8a5e49',right:'#634535',top:W?'#e8eae2':'#ad8060'});
    for(let z=5;z<h;z+=7){K.ln(P(u,v+width,z),P(u+width,v+width,z),'#72503e');K.ln(P(u+width,v,z),P(u+width,v+width,z),'#4b392f');}
    box(u-.015,v-.015,width+.03,width+.03,2,{left:'#a77a56',right:'#765941',top:W?'#e8eae2':'#443d36'},h);
    if(smoke){const p=P(u+width*.5,v+width*.5,h+2);(T.hooks.smoke||(T.hooks.smoke=[])).push(p);if(T.k===3&&(!T.hooks.aviation||p[1]<T.hooks.aviation[1]))T.hooks.aviation=p.slice();}
  };
  const bottle=(u,v,r,h)=>{
    const lo=quad(u,v,r,r),shoulder=quad(u+r*.15,v+r*.15,r*.7,r*.7,h*.56),neck=quad(u+r*.36,v+r*.36,r*.28,r*.28,h);
    K.face([lo[3],lo[2],shoulder[2],shoulder[3]],'#9b6b51');K.face([lo[2],lo[1],shoulder[1],shoulder[2]],'#6d4c3d');
    K.face([shoulder[3],shoulder[2],neck[2],neck[3]],'#af8061');K.face([shoulder[2],shoulder[1],neck[1],neck[2]],'#7c5946');K.face(neck,W?'#dae2dc':'#3f3b35');
    for(const f of[.18,.36,.54]){const z=h*f;K.ln(P(u+r*.10,v+r*.90,z),P(u+r*.90,v+r*.90,z),'#704e3b');}
    const p=P(u+r*.5,v+r*.5,h);(T.hooks.smoke||(T.hooks.smoke=[])).push(p);
  };
  const crate=(u,v,du=.11,dv=.11,h=5,col='#a0845a')=>{box(u,v,du,dv,h,{left:col,right:T.shade(col,-22),top:W?'#e3e7df':T.shade(col,15)});K.ln(P(u,v+dv,1),P(u+du,v+dv,h-1),'#6e5a3d');K.ln(P(u+du,v,1),P(u+du,v+dv,h-1),'#66533a');};
  const rail=(u,v,du,dv=0)=>{for(const z of[2,5])K.ln(P(u,v,z),P(u+du,v+dv,z),'#354444');const steps=Math.ceil(Math.hypot(du,dv)/.07);for(let i=0;i<=steps;i++)K.ln(P(u+du*i/steps,v+dv*i/steps),P(u+du*i/steps,v+dv*i/steps,7),'#3e4b48');};
  const wall=(u,v,du,dv=0)=>{const w=.028;if(dv)box(u,v,w,dv,5,{left:'#9d8a70',right:'#6b6556',top:W?'#e5e9e0':'#cbb998'});else box(u,v,du,w,5,{left:'#9d8a70',right:'#6b6556',top:W?'#e5e9e0':'#cbb998'});};
  const flower=(u,v,z)=>{const p=P(u,v,z);K.px(p[0]-2,p[1],'#76563e',5,2);if(!W){K.px(p[0]-2,p[1]-1,T.sea===2?'#9a8149':'#4b7350',5,1);if(T.sea!==3)K.px(p[0]-1,p[1]-2,T.sea===0?'#dab8bd':'#cba86a',1,1);}};
  const shell=(m,annex=false)=>{
    const [u,v,du,dv,h,fl,material,rt,detail='']=m,has=s=>detail.split(' ').includes(s),shop=(detail.match(/shop:([A-Z]+)/)||[])[1],mill=has('mill'),timber=material==='tudor'||has('tudor'),pitch=rt==='flat'?0:rt==='spire'?11:rt==='mansard'?9:rt==='saw'?7:rt==='glass'?8:rt==='barrel'?7:Math.max(6,Math.min(11,du*17));
    const base=mat[material]||mat.brick,front=T.shade(base,we===0?-7:we===2?5:0),side=T.shade(front,-28),cols=[front,side];
    box(u,v,du,dv,h,{left:front,right:side,top:roof,edge:'#655b4d'});
    const wp=(s,t,z)=>s===0?P(u+du*t,v+dv,z):P(u+du,v+dv*(1-t),z);
    const panel=(s,a,b,z0,z1,c)=>K.face([wp(s,a,z0),wp(s,b,z0),wp(s,b,z1),wp(s,a,z1)],c);
    const band=(z,col=trim,width=1)=>{K.ln(wp(0,0,z),wp(0,1,z),col,width);K.ln(wp(1,0,z),wp(1,1,z),T.shade(col,-16),width);};
    const lite=(s,a,b,z0,z1,lit)=>glass([wp(s,a,z0),wp(s,b,z0),wp(s,b,z1),wp(s,a,z1)],s?'#425c69':'#5c7781',lit);
    const floorH=h/Math.max(1,fl),winH=Math.max(3,Math.min(mill?8:7,floorH-4));
    /* 磚的交錯灰縫、木板或石材水平分縫，不使用雜訊流。 */
    for(let z=3;z<h-1;z+=material==='weatherboard'?3:4){
      band(z,T.shade(front,material==='weatherboard'?11:-8));
      if(material!=='render'&&material!=='stucco'&&material!=='deco'&&material!=='weatherboard')for(let s=0;s<2;s++){
        const width=s?dv:du,step=.12/width;for(let a=.04+((z/4|0)&1)*step*.5;a<.99;a+=step)K.ln(wp(s,a,z),wp(s,a,z-2),T.shade(cols[s],8));
      }
    }
    for(let s=0;s<2;s++){
      const width=s?dv:du,columns=Math.max(1,Math.round(width*(mill?5.5:4.6)));
      for(let f=0;f<fl;f++){
        if(f===0&&(shop||(has('loading')&&s===0)||has('arcade')||has('bank')))continue;
        const z0=f*floorH+3,z1=Math.min(h-2,z0+winH),ww=Math.min(.61,.14/width*columns);
        for(let j=0;j<columns;j++){
          const mid=(j+.5)/columns,a=mid-ww/(2*columns),b=mid+ww/(2*columns),lit=(f*7+j*3+T.v+s)%5===0?'#947f5b':T.k===3?'#dbcea5':'#f4d498';
          panel(s,a-.024,b+.024,z0-1,z1+1,material==='gothic'?'#bfab88':trim);
          lite(s,a,b,z0,z1,lit);
          K.ln(wp(s,a,(z0+z1)*.5),wp(s,b,(z0+z1)*.5),trim);
          if(mill||material==='tudor'||material==='gothic')K.ln(wp(s,mid,z0),wp(s,mid,z1),trim);
          K.ln(wp(s,a-.035,z0-1),wp(s,b+.035,z0-1),T.shade(trim,-7));
          if(material==='gothic')K.face([wp(s,a-.03,z1+1),wp(s,b+.03,z1+1),wp(s,mid,z1+3)],'#d6c3a2');
          if(we===2&&f===0&&s===0&&T.k===1)flower(u+du*mid,v+dv+.012,z0-2);
        }
      }
    }
    if(timber){
      for(let s=0;s<2;s++){
        const cols=Math.max(2,Math.round((s?dv:du)*7));for(let i=0;i<=cols;i++)K.ln(wp(s,i/cols,0),wp(s,i/cols,h),'#514d40',1.5);
        for(let f=1;f<fl;f++)K.ln(wp(s,0,f*floorH),wp(s,1,f*floorH),'#5a5140',2);
        for(let i=0;i<cols;i++)K.ln(wp(s,i/cols,h-2),wp(s,(i+1)/cols,h-floorH+2),'#5b5140');
      }
    }
    if(material==='deco'){for(const z of[3,h-3,h-6])band(z,'#a6a798',2);for(let s=0;s<2;s++)for(const t of[.12,.88])K.ln(wp(s,t,5),wp(s,t,h-7),'#ece5cb',2);}
    if(has('bank')){
      for(let s=0;s<2;s++){for(const t of[.12,.36,.64,.88])K.ln(wp(s,t,2),wp(s,t,Math.min(19,h-3)),trim,2);for(const t of[.25,.5,.75])lite(s,t-.065,t+.065,3,Math.min(14,h-4),'#e5d4ac');}band(18,trim,2);
    }
    if(shop){
      const signCol=shop==='ALE'||shop==='INN'?'#345650':shop==='POST'||shop==='MEAT'?'#733e38':shop==='BOOK'?'#355361':'#385d56';
      for(let s=0;s<2;s++){
        const cols=Math.max(1,Math.round((s?dv:du)*4));for(let j=0;j<cols;j++){const a=(j+.11)/cols,b=(j+.87)/cols;panel(s,a-.018,b+.018,1,11,trim);lite(s,a,b,2,10,'#f4d395');K.ln(wp(s,(a+b)/2,2),wp(s,(a+b)/2,10),'#d7c69e');}
        panel(s,.015,.985,12,16,signCol);K.ln(wp(s,.02,16),wp(s,.98,16),trim);
      }
      const p=wp(0,.5,14);for(let i=0;i<Math.min(shop.length,5);i++){const x=p[0]+(i-(Math.min(shop.length,5)-1)/2)*3,y=p[1]+(i-(Math.min(shop.length,5)-1)/2)*1.5;K.px(x-1,y-1,'#ecddb8',2,2);}
      if(du>.43)K.sign(u+du*.42,v+dv,17,shop,signCol);if(T.k===2&&!T.hooks.sign)T.hooks.sign=P(u+du*.42,v+dv,17);
      if(has('awning')){const a=P(u+.02,v+dv,12),b=P(u+du-.02,v+dv,12),c=P(u+du-.02,v+dv+.08,10),d=P(u+.02,v+dv+.08,10);K.face([a,b,c,d],W?'#e6ebe3':'#c6b888');for(let i=0;i<6;i+=2)K.face([mix(a,b,i/6),mix(a,b,(i+1)/6),mix(d,c,(i+1)/6),mix(d,c,i/6)],W?'#d5ded5':signCol);K.ln(d,c,trim);}
    }
    if(has('loading')||has('arch')||has('arcade')){
      const count=has('arcade')?Math.max(2,Math.round(du*5)):has('loading')&&du>.62?2:1;
      for(let i=0;i<count;i++){
        const t=(i+.5)/count,half=Math.min(.135,.095/du),z=Math.min(has('arcade')?15:12,h-3);panel(0,t-half-.025,t+half+.025,0,z+2,trim);panel(0,t-half,t+half,0,z,'#3a4342');
        if(has('arcade'))lite(0,t-half+.01,t+half-.01,2,z-1,'#dec795');
        else{for(let a=t-half+.02;a<t+half;a+=.045)K.ln(wp(0,a,0),wp(0,a,z),'#677068');K.ln(wp(0,t-half,2),wp(0,t+half,z-1),'#8c9280');}
        if(has('arch')||has('arcade')){const a=wp(0,t-half-.025,z),b=wp(0,t,z+4),c=wp(0,t+half+.025,z);K.ln(a,b,trim,2);K.ln(b,c,trim,2);}
      }
    }else if(!shop&&!annex){
      const doors=has('doors')?3:1;for(let i=0;i<doors;i++){const t=(i+.5)/doors,half=Math.min(.065,.048/du);panel(0,t-half-.025,t+half+.025,0,10,trim);panel(0,t-half,t+half,0,9,we===0?'#5a5b4e':we===2?'#315448':'#3e5652');lite(0,t-half,t+half,8,9,'#ddc99b');const p=wp(0,t+half*.5,4);K.px(p[0],p[1],'#bda472');}
    }
    for(const z of[h-1,h])band(z,trim,1);
    if(fl>2&&!mill)for(let f=1;f<fl;f++)band(f*floorH-.5,material==='brick'?'#c5ad8c':T.shade(front,13));
    /* 英式板岩山牆、四坡頂、蝶形谷頂、北向採光鋸齒頂與有頂拱廊。 */
    const a=P(u,v,h),b=P(u+du,v,h),c=P(u+du,v+dv,h),d=P(u,v+dv,h),r0=P(u+du*.5,v,h+pitch),r1=P(u+du*.5,v+dv,h+pitch);
    if(rt==='gable'||rt==='glass'){
      if(rt==='glass'){glass([a,r0,r1,d],W?'#bfceca':'#668995','#bcb99a');glass([r0,b,c,r1],W?'#b4c9c7':'#446d7d','#939c8d');}
      else{K.face([a,r0,r1,d],roof);K.face([r0,b,c,r1],roofDark);}
      K.face([d,c,r1],front);K.ln(d,r1,trim);K.ln(r1,c,trim);K.ln(r0,r1,W?'#f2f4ef':'#8b9190');
      for(const f of[.25,.5,.75]){K.ln(mix(a,r0,f),mix(d,r1,f),W?'#d5dfd8':'#5d6b70');K.ln(mix(r0,b,f),mix(r1,c,f),W?'#baccc6':'#42545d');}
      if(rt==='glass')for(let f=.14;f<1;f+=.14){K.ln(mix(a,d,f),mix(r0,r1,f),trim);K.ln(mix(r0,r1,f),mix(b,c,f),trim);}
      if(timber){K.ln(P(u+du*.5,v+dv,h),r1,'#534c3f',2);K.ln(d,P(u+du*.5,v+dv,h+pitch*.6),'#5f5441');K.ln(c,P(u+du*.5,v+dv,h+pitch*.6),'#5f5441');}
      if(du>.37&&!annex){const p=P(u+du*.5,v+dv,h+pitch*.33);K.px(p[0]-2,p[1]-2,trim,5,5);T.LIT(p[0]-1,p[1]-1,3,3,'#526e77','#dec899');K.px(p[0],p[1]-1,trim,1,3);}
    }else if(rt==='hip'||rt==='spire'){
      const q0=P(u+du*.5,v+dv*.23,h+pitch),q1=P(u+du*.5,v+dv*.77,h+pitch),peak=P(u+du*.5,v+dv*.5,h+pitch);
      if(rt==='spire'){K.face([a,b,peak],roof);K.face([a,peak,d],roof);K.face([b,c,peak],roofDark);K.face([d,peak,c],W?'#e7eee7':'#5c6970');K.ln(peak,P(u+du*.5,v+dv*.5,h+pitch+4),'#6b6c5e');}
      else{K.face([a,b,q0],roofDark);K.face([a,q0,q1,d],roof);K.face([b,c,q1,q0],roofDark);K.face([d,q1,c],W?'#eaf0e8':'#66737a');K.ln(q0,q1,W?'#f2f4ef':'#92948b');K.ln(d,q1,W?'#f2f4ef':'#7d888b');}
    }else if(rt==='mansard'){
      const inset=Math.min(.08,du*.19,dv*.19),q=quad(u+inset,v+inset,du-2*inset,dv-2*inset,h+pitch);
      K.face([a,q[0],q[3],d],roof);K.face([b,c,q[2],q[1]],roofDark);K.face([d,q[3],q[2],c],W?'#edf1e9':'#596972');K.face(q,W?'#e3eae4':'#727878');K.ln(q[3],q[2],trim);
      for(let i=0;i<Math.max(1,Math.round(du*4));i++){const t=(i+.5)/Math.max(1,Math.round(du*4)),p=P(u+du*t,v+dv-.025,h+4);K.px(p[0]-2,p[1]-4,trim,5,6);T.LIT(p[0]-1,p[1]-3,3,4,'#4f6d78','#efd4a0');K.face([[p[0]-3,p[1]-4],[p[0],p[1]-7],[p[0]+3,p[1]-4]],roofDark);}
    }else if(rt==='saw'){
      const teeth=Math.max(2,Math.round(du*5));for(let i=0;i<teeth;i++){
        const x=u+du*i/teeth,w=du/teeth,qa=P(x,v,h),qb=P(x+w,v,h),qc=P(x+w,v+dv,h),qd=P(x,v+dv,h),q0=P(x+w*.75,v,h+pitch),q1=P(x+w*.75,v+dv,h+pitch);
        K.face([qa,q0,q1,qd],roof);glass([q0,qb,qc,q1],W?'#c4d3ce':'#4f7b86','#b3bda6');K.face([qd,qc,q1],front);K.ln(q0,q1,trim);K.ln(qd,q1,trim);
        for(const f of[.3,.6,.9])K.ln(mix(q0,q1,f),mix(qb,qc,f),trim);
      }
    }else if(rt==='barrel'){
      const curve=[0,.66,1,.66,0],pts=curve.map((z,i)=>[P(u+du*i/4,v,h+z*pitch),P(u+du*i/4,v+dv,h+z*pitch)]);
      for(let i=0;i<4;i++){K.face([pts[i][0],pts[i+1][0],pts[i+1][1],pts[i][1]],W?['#e5eae5','#eef2ea','#d1dfd6','#bbcfc8'][i]:['#687678','#7b8582','#56676b','#3b515a'][i]);K.ln(pts[i+1][0],pts[i+1][1],W?'#e1e8df':'#8d968c');}
      K.face([d,c,...pts.slice().reverse().map(p=>p[1])],front);for(let i=0;i<4;i++)K.ln(pts[i][1],pts[i+1][1],trim);
    }else if(rt==='butterfly'){
      const valley0=P(u+du*.5,v,h-3),valley1=P(u+du*.5,v+dv,h-3);K.face([a,valley0,valley1,d],roof);K.face([valley0,b,c,valley1],roofDark);K.ln(d,c,trim,2);K.ln(a,d,trim,2);K.ln(b,c,trim,2);
    }else if(rt==='lean'){
      const q0=P(u,v,h+5),q1=P(u+du,v,h+5);K.face([q0,q1,c,d],roof);K.face([b,c,q1],side);K.ln(d,c,trim);
    }else{
      plate(u+.018,v+.018,du-.036,dv-.036,h+.5,W?'#dfe7df':'#70776f');for(const [x,y]of[[a,d],[d,c],[c,b]])K.ln([x[0],x[1]-3],[y[0],y[1]-3],trim,2);K.ln(d,c,T.shade(trim,-15));
      if(material==='deco')for(let i=0;i<3;i++)K.ln(P(u+.035,v+dv,h+i),P(u+du-.035,v+dv,h+i),i===1?'#747e75':trim);
    }
    if(has('dormer')&&rt!=='mansard'&&du>.39){const p=P(u+du*.55,v+dv*.78,h+pitch*.55);K.px(p[0]-3,p[1]-5,trim,6,6);T.LIT(p[0]-2,p[1]-4,4,4,'#57717b','#ead099');K.face([[p[0]-4,p[1]-5],[p[0],p[1]-9],[p[0]+4,p[1]-5]],roofDark);}
    if(has('pediment')){const z=shop?18:11;K.face([wp(0,.32,z),wp(0,.68,z),wp(0,.5,z+4)],trim);K.ln(wp(0,.34,z+1),wp(0,.66,z+1),T.shade(trim,-23));}
    if(has('clock')){const p=wp(0,.5,h-8);K.px(p[0]-3,p[1]-4,'#5b5f55',7,8);K.px(p[0]-2,p[1]-3,'#e0d4ac',5,6);K.ln([p[0],p[1]],[p[0],p[1]-3],'#394642');K.ln([p[0],p[1]],[p[0]+2,p[1]+1],'#394642');}
    if(has('crane')){const q=P(u+du*.52,v+dv+.03,h-2),r=P(u+du*.52,v+dv+.16,h-2);K.ln(q,r,'#454e49',2);K.ln(r,[r[0],r[1]+15],'#5c6159');K.ln([r[0],r[1]+15],[r[0]+2,r[1]+16],'#383f3b');}
    if(has('balcony')){const z=Math.min(22,h*.6);K.face(quad(u+.04,v+dv-.01,du-.08,.075,z),'#78837a');for(let t=.08;t<.94;t+=.12)K.ln(P(u+du*t,v+dv+.065,z),P(u+du*t,v+dv+.065,z+5),'#455852');K.ln(P(u+.04,v+dv+.065,z+5),P(u+du-.04,v+dv+.065,z+5),'#455852');}
    if(has('bay')&&du>.2&&!annex){const count=du>.63?2:1,bw=Math.min(.18,du*.42);for(let i=0;i<count;i++){const bu=u+du*(i+.5)/count-bw*.5,bv=v+dv-.014;shell([bu,bv,bw,.085,Math.max(12,h-5),fl,material,'hip',''],true);}}
    if(has('porch')&&!annex){const x=u+du*.47,y=v+dv+.015,w=.11;for(const xx of[x-w*.5,x+w*.5])K.ln(P(xx,y+.07),P(xx,y+.07,10),trim,2);K.face([P(x-w*.8,y,10),P(x+w*.8,y,10),P(x+w*.8,y+.10,10),P(x-w*.8,y+.10,10)],roof);}
    if(!annex&&T.k!==3&&rt!=='glass'&&rt!=='spire'&&rt!=='saw'&&material!=='deco'){K.chimney(u+du*.13,v+dv*.17,h+pitch*.12);if(du>.65&&h>40)K.chimney(u+du*.77,v+dv*.22,h+pitch*.24);}
    if(we===0&&T.k===1){panel(1,.14,.27,2,4,T.shade(side,-12));panel(0,.08,.17,Math.min(14,h-3),Math.min(16,h-1),T.shade(front,-9));}
  };
  return {K,shell,plate,stack,bottle,crate,rail,wall,flower,glass};
}
function drawRCI634(T){
  const lv=Math.max(1,Math.min(3,T.lv|0)),v=((T.v|0)%12+12)%12,A=RCI_CATALOG634[T.k+'_'+lv+'_'+v];if(!A)return;
  const R=rciPainter634(T),{K,shell,plate,stack,bottle,crate,rail,wall,flower}=R,{P,quad,box}=T,W=T.winter,grass=T.sea===2?'#9b9668':T.sea===1?'#789067':T.sea===3?'#8a9276':'#8c9b6e';
  const residential=T.k===1,industrial=T.k===3,garden=A.yard==='garden',paving=industrial?'#8e8d7d':A.yard==='court'?'#bbb298':'#b6b4a2';
  K.ground(.035,.035,.93,.93,residential&&A.yard!=='court'?grass:paving);
  if(!W){
    if(garden){K.ground(.42,.06,.12,.88,'#c4bba2');K.ground(.12,.77,.75,.10,'#b4ad91');}
    else for(let j=1;j<5;j++){K.ln(P(.04,.04+j*.185),P(.96,.04+j*.185),T.shade(paving,6));if(!industrial)K.ln(P(.04+j*.185,.04),P(.04+j*.185,.96),T.shade(paving,-5));}
  }
  if(garden){K.hedge(.08,.07,.74,.035);K.tree(.88,.10,.105);}
  /* 高煙囪先於前方廠房；工業最高煙口也提供航空掛點。 */
  const smokestacks={forge:[.78,.09,36,.075],bricks:[.80,.08,42,.085],mill:[.84,.055,lv===3?92:64,.07],foundry:[.84,.06,65,.085],engineering:[.85,.06,lv===3?91:67,.065],doublekiln:[.84,.065,58,.085],brewery:[.84,.06,66,.07],paper:[.085,.08,57,.065],tallmill:[.85,.055,105,.075],heavy:[.86,.055,103,.08],bigbrewery:[.84,.06,100,.08],powerworks:[.855,.055,112,.085],gantry:[.84,.065,90,.08],towerworks:[.86,.055,117,.07]};
  if(smokestacks[A.yard])stack(...smokestacks[A.yard]);
  if(A.yard==='paper'){
    for(const [u,vv]of[[.79,.17],[.88,.17],[.79,.28],[.88,.28]])K.ln(P(u,vv),P(u,vv,40),'#5a6962',2);
    K.tank(.835,.225,.10,48,'#8b9994');
  }
  /* 等深時依原清冊順序；退台上樓先畫、低處前樓自然遮住其底部。 */
  const masses=A.m.map((m,i)=>({m,i,d:m[0]+m[1]+m[2]+m[3]})).sort((a,b)=>a.d-b.d||a.i-b.i);for(const a of masses)shell(a.m);
  if(residential){
    if(A.yard==='rail'){rail(.08,.91,.32);rail(.58,.91,.33);rail(.92,.13,0,.78);}
    if(A.yard==='wall'){wall(.08,.90,.31);wall(.60,.90,.31);wall(.91,.16,0,.74);}
    if(garden){K.hedge(.08,.89,.28,.045);K.hedge(.61,.89,.29,.045);flower(.25,.86,1);flower(.72,.86,1);if(T.we===2)K.hedge(.91,.48,.03,.40);}
    if(A.yard==='court'){rail(.08,.91,.30);rail(.60,.91,.31);K.ground(.43,.78,.12,.16,'#cfc4a8');}
  }else if(T.k===2){
    if(A.yard==='rail'){rail(.09,.91,.29);rail(.62,.91,.29);}
    if(A.yard==='pub'){
      for(const [u,vv]of[[.62,.83],[.79,.86]]){box(u-.03,vv-.03,.09,.09,5,{left:'#806548',right:'#564f3a',top:W?'#e9eee7':'#b09667'});for(const off of[-.045,.09])box(u+off,vv-.025,.035,.085,3,{left:'#786a4c',right:'#5a533c',top:W?'#e0e6dd':'#998862'});}
      K.sign(.82,.78,22,'ALE','#34534b');
    }
    if(A.yard==='market'){
      for(const [u,vv,c]of[[.16,.83,'#755444'],[.69,.83,'#45625b']]){
        for(const x of[u,u+.13])K.ln(P(x,vv),P(x,vv,8),'#5a5745');K.face(quad(u-.01,vv-.035,.16,.105,8),W?'#e6ebe4':c);box(u,vv-.01,.13,.08,4,{left:'#9c845a',right:'#6f6349',top:W?'#e3e8df':'#c5b482'});
      }
    }
    if(A.yard==='produce'){for(let i=0;i<3;i++){crate(.25+i*.15,.84,.12,.09,4);if(!W){const p=P(.30+i*.15,.885,5);K.px(p[0]-2,p[1]-1,['#79914e','#bd8652','#9a5950'][i],4,2);}}}
    if(A.yard==='post'){const p=P(.88,.85);K.px(p[0]-2,p[1]-9,'#883f37',5,9);K.px(p[0]-2,p[1]-10,W?'#e4e8df':'#af5745',5,2);K.px(p[0]-1,p[1]-7,'#332f28',3,1);}
    if(lv===3)K.lamp(.92,.89,14);
  }else{
    const wood=(u,vv,len=.20,rows=3)=>{for(let j=0;j<rows;j++){box(u,vv+j*.035,len,.03,4+j%2,{left:'#9b7950',right:'#715738',top:W?'#e2e6dc':'#c0a172'});K.ln(P(u+.035,vv+j*.035,5),P(u+len-.02,vv+j*.035,5),'#8a734d');}};
    const coal=(u,vv,r=.16)=>{const q=quad(u,vv,r,r),p=P(u+r*.5,vv+r*.5,7);K.face([q[0],q[1],q[2],p],W?'#becbc2':'#454b43');K.face([q[2],q[3],q[0],p],W?'#d6dfd5':'#5d6357');K.ln(q[3],p,W?'#e4e9df':'#747765');};
    const pipe=(u,vv,h,u2,v2,h2)=>{K.ln(P(u,vv,h),P(u2,v2,h2),'#4d625f',3);K.ln(P(u-.01,vv,h),P(u2-.01,v2,h2),'#92a19a');};
    switch(A.yard){
      case 'timber':wood(.15,.79,.27,3);wood(.58,.81,.24,2);break;
      case 'logs':wood(.13,.65,.30,4);wood(.55,.77,.28,4);break;
      case 'forge':coal(.60,.74,.19);crate(.77,.77,.11,.1,5,'#737566');break;
      case 'bricks':bottle(.69,.46,.19,28);for(let i=0;i<3;i++)crate(.18+i*.16,.80,.13,.09,5,'#b5795a');break;
      case 'dairy':K.tank(.81,.71,.075,19,'#acb9b3');K.tank(.81,.87,.065,16,'#b9c4b8');pipe(.79,.69,14,.66,.70,14);break;
      case 'garage':for(const x of[.22,.69]){crate(x,.83,.12,.10,4,'#64726c');const p=P(x+.06,.88,5);K.px(p[0]-1,p[1]-2,'#303f3d',3,2);}break;
      case 'pottery':bottle(.68,.53,.22,36);crate(.24,.78,.12,.1,6);crate(.42,.82,.11,.1,4);break;
      case 'stoneworks':for(const [x,y,h]of[[.68,.29,6],[.71,.49,9],[.25,.71,5],[.44,.81,8],[.70,.79,7]])box(x,y,.14,.12,h,{left:'#c4baa0',right:'#8e8b78',top:W?'#e1e7df':'#d6ccb0'});break;
      case 'coal':coal(.15,.69,.21);coal(.42,.75,.20);coal(.70,.69,.17);break;
      case 'doublekiln':bottle(.17,.56,.25,32);bottle(.58,.57,.26,38);for(let i=0;i<3;i++)crate(.19+i*.22,.86,.13,.08,4,'#b67d59');break;
      case 'brewery':case 'bigbrewery':for(const [x,y,h]of[[.23,.83,16],[.43,.84,19],[.82,.83,15]])K.tank(x,y,.067,h,'#b89868');pipe(.23,.83,11,.43,.84,11);break;
      case 'paper':wood(.17,.77,.25,3);crate(.57,.84,.14,.09,6,'#c4bea8');break;
      case 'tannery':for(const y of[.23,.47,.72]){K.ground(.70,y,.19,.17,'#a49e83');K.water(.72,y+.02,.15,.12);}crate(.24,.84,.19,.09,5);break;
      case 'foundry':coal(.61,.78,.19);crate(.18,.86,.13,.08,4,'#6b776d');pipe(.81,.76,9,.83,.53,20);break;
      case 'depot':for(const y of[.84,.93]){K.ln(P(.07,y),P(.93,y),'#696e60');for(let x=.10;x<.94;x+=.08)K.ln(P(x,y-.023),P(x,y+.023),'#94856a');}box(.53,.835,.24,.08,5,{left:'#7f7353',right:'#535e50',top:W?'#dfe5dc':'#9f9171'});break;
      case 'heavy':case 'gantry':{
        const h=A.yard==='heavy'?37:43;for(const x of[.14,.85]){K.ln(P(x,.89),P(x,.89,h),'#697668',3);K.ln(P(x-.03,.89),P(x-.03,.89,h),'#a9ae92');}
        K.ln(P(.14,.89,h),P(.85,.89,h),'#737f6c',4);K.ln(P(.14,.89,h+2),P(.85,.89,h+2),'#adb296');for(let x=.16;x<.82;x+=.10)K.ln(P(x,.89,h-1),P(x+.08,.89,h+2),'#4a6054');K.ln(P(.54,.89,h),P(.54,.89,h-17),'#5c6657');crate(.50,.84,.16,.11,7,'#757b6a');break;}
      case 'powerworks':K.tank(.86,.83,.065,23,'#a5b0a1');pipe(.82,.69,26,.86,.83,18);crate(.24,.85,.13,.08,6,'#6c776a');break;
      case 'flour':for(const [x,y,h]of[[.85,.36,57],[.85,.58,62],[.85,.80,66]])K.tank(x,y,.077,h,'#c4c2a7');pipe(.83,.37,50,.83,.77,50);break;
      case 'towerworks':crate(.72,.83,.14,.10,7,'#7e8674');pipe(.78,.66,17,.85,.84,17);break;
      default:crate(.18,.86,.14,.08,5);crate(.68,.85,.14,.09,7,'#9a8d6c');
    }
    rail(.085,.955,.27);rail(.63,.955,.28);
  }
}
const RCI634={
  1:{name:'英式住宅：連排屋、花園別墅與都市宅邸',draw(T){drawRCI634(T);}},
  2:{name:'英式商業：高街、酒館、市集與辦公街廓',draw(T){drawRCI634(T);}},
  3:{name:'英式工業：作坊、北向採光廠與工業城',draw(T){drawRCI634(T);}}
};
