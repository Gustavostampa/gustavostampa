#!/usr/bin/env python3
"""
Multi-pedidos Date Investigation - WMS Scanner
Investigar datas das cargas Multi-pedidos para entender por que não aparecem no painel do conferente

Contexto:
Usuário relata que cargas Multi-pedidos ainda não aparecem no painel do conferente, 
mesmo após a correção do filtro de tipo.
Suspeita: pode ser problema de datas - as cargas Multi podem ter datas antigas ou 
futuras que não correspondem ao filtro padrão (data de hoje).
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta, timezone

# Configuration
BACKEND_URL = "https://wms-scanner.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {"login": "admin", "senha": "admin123"}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.ENDC}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{msg}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")

class MultiPedidosDateInvestigator:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.today = datetime.now().strftime('%Y-%m-%d')
        
    def authenticate(self):
        """Authenticate with admin credentials if needed"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=ADMIN_CREDENTIALS)
            if response.status_code == 200:
                self.auth_token = response.json()
                print_success("Authentication successful")
                return True
            else:
                print_warning(f"Authentication failed: {response.status_code}")
                return True  # Continue without auth as it might not be required
        except Exception as e:
            print_warning(f"Authentication error: {e}")
            return True  # Continue without auth
    
    def make_request(self, endpoint, params=None):
        """Make GET request to API endpoint"""
        try:
            url = f"{BACKEND_URL}{endpoint}"
            print_info(f"Request: GET {url}")
            if params:
                print_info(f"Parameters: {params}")
            
            response = self.session.get(url, params=params)
            
            print_info(f"Status Code: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    return response.status_code, data
                except json.JSONDecodeError:
                    return response.status_code, {"error": "Invalid JSON response"}
            else:
                return response.status_code, {"error": "Non-JSON response", "content": response.text[:200]}
                
        except requests.exceptions.RequestException as e:
            print_error(f"Request failed: {e}")
            return None, {"error": str(e)}
    
    def test_1_list_all_multi_without_date_filter(self):
        """Teste 1: Listar TODAS as cargas Multi sem filtro de data"""
        print_header("TESTE 1: Listar TODAS as cargas Multi sem filtro de data")
        print_info("Objetivo: ver todas as datas disponíveis nas cargas Multi")
        
        status_code, data = self.make_request("/cargas", {"tipo": "multi"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("List All Multi", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        total_multi = data.get("total", 0)
        cargas = data.get("cargas", [])
        
        print_info(f"Total cargas Multi encontradas: {total_multi}")
        print_info(f"Cargas retornadas nesta página: {len(cargas)}")
        
        if total_multi == 0:
            print_warning("❌ PROBLEMA: Nenhuma carga Multi encontrada no sistema!")
            self.test_results.append(("List All Multi", False, "❌ Nenhuma carga Multi no sistema"))
            return False
        
        # Analisar datas das cargas Multi
        print_info("\n📅 ANÁLISE DE DATAS DAS CARGAS MULTI:")
        print_info("-" * 60)
        
        dates_found = {}
        status_counts = {}
        
        for i, carga in enumerate(cargas, 1):
            carga_id = carga.get("identificador_carga", "N/A")
            data_carga = carga.get("data", "N/A")
            status = carga.get("status", "N/A")
            tipo = carga.get("tipo", "N/A")
            
            print_info(f"{i:2d}. ID: {carga_id:15} | Data: {data_carga:12} | Status: {status:12} | Tipo: {tipo}")
            
            # Contar datas
            if data_carga != "N/A":
                dates_found[data_carga] = dates_found.get(data_carga, 0) + 1
            
            # Contar status
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print_info("-" * 60)
        print_info(f"📊 RESUMO DE DATAS ENCONTRADAS:")
        for data_str, count in sorted(dates_found.items()):
            print_info(f"   Data {data_str}: {count} cargas Multi")
        
        print_info(f"📊 RESUMO DE STATUS:")
        for status, count in sorted(status_counts.items()):
            print_info(f"   Status {status}: {count} cargas Multi")
        
        self.test_results.append(("List All Multi", True, f"✅ {total_multi} cargas Multi, datas: {list(dates_found.keys())}"))
        return True, dates_found, status_counts
    
    def test_2_verify_server_date(self):
        """Teste 2: Verificar data de hoje no servidor"""
        print_header("TESTE 2: Verificar data de hoje")
        
        # Data local
        local_today = datetime.now().strftime('%Y-%m-%d')
        local_utc_today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        print_info(f"Data local (sistema): {local_today}")
        print_info(f"Data UTC: {local_utc_today}")
        
        # Tentar obter data do servidor via API (se houver endpoint)
        status_code, data = self.make_request("/cargas/ultima-atualizacao")
        
        if status_code == 200 and "ultima_atualizacao" in data:
            server_timestamp = data["ultima_atualizacao"]
            print_info(f"Última atualização do servidor: {server_timestamp}")
            
            # Extrair data do timestamp
            try:
                if 'T' in server_timestamp:
                    server_date = server_timestamp.split('T')[0]
                else:
                    server_date = server_timestamp[:10]
                print_info(f"Data do servidor extraída: {server_date}")
            except:
                server_date = local_today
                print_warning("Não foi possível extrair data do servidor, usando data local")
        else:
            server_date = local_today
            print_warning("Endpoint de data não disponível, usando data local")
        
        self.today = server_date
        print_success(f"✅ Data de referência para testes: {self.today}")
        
        self.test_results.append(("Server Date", True, f"✅ Data de hoje: {self.today}"))
        return True
    
    def test_3_test_with_today_date(self):
        """Teste 3: Teste com data de hoje"""
        print_header(f"TESTE 3: Teste com data de hoje ({self.today})")
        print_info("Objetivo: verificar quantas cargas Multi têm data de hoje")
        
        status_code, data = self.make_request("/cargas", {"data": self.today, "tipo": "multi"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Today Date Filter", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        total_today = data.get("total", 0)
        cargas_today = data.get("cargas", [])
        
        print_info(f"Cargas Multi com data de hoje ({self.today}): {total_today}")
        
        if total_today == 0:
            print_warning(f"⚠️ NENHUMA carga Multi encontrada para data de hoje ({self.today})")
            print_warning("Isso pode explicar por que não aparecem no painel do conferente!")
        else:
            print_success(f"✅ Encontradas {total_today} cargas Multi para hoje")
            
            for i, carga in enumerate(cargas_today, 1):
                carga_id = carga.get("identificador_carga", "N/A")
                status = carga.get("status", "N/A")
                print_info(f"   {i}. {carga_id} - Status: {status}")
        
        self.test_results.append(("Today Date Filter", True, f"✅ {total_today} cargas Multi para hoje"))
        return True, total_today
    
    def test_4_test_without_filters_conferente_style(self):
        """Teste 4: Teste SEM filtro de data E tipo (como conferente faz)"""
        print_header("TESTE 4: Teste SEM filtros (como conferente faz)")
        print_info("Objetivo: simular exatamente o que o conferente vê")
        
        status_code, data = self.make_request("/cargas")
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("No Filters", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        total_cargas = data.get("total", 0)
        cargas = data.get("cargas", [])
        
        print_info(f"Total de cargas sem filtros: {total_cargas}")
        
        # Analisar tipos e datas
        tipo_counts = {}
        date_counts = {}
        multi_cargas = []
        
        for carga in cargas:
            tipo = carga.get("tipo", "unknown")
            data_carga = carga.get("data", "N/A")
            status = carga.get("status", "N/A")
            
            tipo_counts[tipo] = tipo_counts.get(tipo, 0) + 1
            date_counts[data_carga] = date_counts.get(data_carga, 0) + 1
            
            if tipo == "multi":
                multi_cargas.append({
                    "id": carga.get("identificador_carga", "N/A"),
                    "data": data_carga,
                    "status": status
                })
        
        print_info(f"📊 TIPOS encontrados: {tipo_counts}")
        print_info(f"📊 DATAS encontradas: {dict(sorted(date_counts.items()))}")
        
        multi_count = tipo_counts.get("multi", 0)
        caixaria_count = tipo_counts.get("caixaria", 0)
        
        print_info(f"\n🎯 CARGAS MULTI sem filtros: {multi_count}")
        if multi_count > 0:
            print_success(f"✅ Conferente PODE ver {multi_count} cargas Multi sem filtros")
            print_info("Detalhes das cargas Multi:")
            for multi in multi_cargas:
                print_info(f"   - {multi['id']} | Data: {multi['data']} | Status: {multi['status']}")
        else:
            print_error("❌ PROBLEMA: Conferente NÃO vê cargas Multi sem filtros!")
            print_error("Isso confirma o problema relatado pelo usuário")
        
        self.test_results.append(("No Filters", True, f"✅ {multi_count} Multi, {caixaria_count} Caixaria"))
        return True, multi_count, multi_cargas
    
    def test_5_test_broad_date_range(self):
        """Teste 5: Teste com range de datas amplo"""
        print_header("TESTE 5: Teste com range de datas amplo")
        print_info("Objetivo: pegar todas as cargas Multi de outubro 2025")
        
        params = {
            "dataInicio": "2025-10-01",
            "dataFim": "2025-10-31",
            "tipo": "multi"
        }
        
        status_code, data = self.make_request("/cargas", params)
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Broad Date Range", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        total_october = data.get("total", 0)
        cargas_october = data.get("cargas", [])
        
        print_info(f"Cargas Multi em outubro 2025: {total_october}")
        
        if total_october == 0:
            print_warning("⚠️ Nenhuma carga Multi encontrada em outubro 2025")
        else:
            print_success(f"✅ Encontradas {total_october} cargas Multi em outubro")
            
            # Analisar distribuição por data
            date_distribution = {}
            for carga in cargas_october:
                data_carga = carga.get("data", "N/A")
                date_distribution[data_carga] = date_distribution.get(data_carga, 0) + 1
            
            print_info("📅 Distribuição por data em outubro:")
            for data_str, count in sorted(date_distribution.items()):
                print_info(f"   {data_str}: {count} cargas")
        
        self.test_results.append(("Broad Date Range", True, f"✅ {total_october} cargas Multi em outubro"))
        return True, total_october
    
    def test_6_verify_date_formats(self):
        """Teste 6: Verificar formato das datas"""
        print_header("TESTE 6: Verificar formato das datas")
        print_info("Objetivo: verificar se há problemas de formato ou timezone")
        
        # Pegar algumas cargas para analisar formato
        status_code, data = self.make_request("/cargas", {"tipo": "multi"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Date Formats", False, f"❌ Status {status_code}"))
            return False
        
        cargas = data.get("cargas", [])
        
        if not cargas:
            print_warning("Nenhuma carga Multi para analisar formato de data")
            self.test_results.append(("Date Formats", True, "⚠️ Nenhuma carga para analisar"))
            return True
        
        print_info("🔍 ANÁLISE DE FORMATOS DE DATA:")
        
        date_formats = {}
        valid_dates = 0
        invalid_dates = 0
        
        for carga in cargas[:10]:  # Analisar primeiras 10
            carga_id = carga.get("identificador_carga", "N/A")
            data_carga = carga.get("data", "N/A")
            
            # Analisar formato
            if data_carga == "N/A":
                print_warning(f"   {carga_id}: Data ausente")
                invalid_dates += 1
                continue
            
            # Verificar se está no formato YYYY-MM-DD
            try:
                datetime.strptime(data_carga, '%Y-%m-%d')
                format_type = "YYYY-MM-DD (correto)"
                valid_dates += 1
            except ValueError:
                try:
                    datetime.strptime(data_carga, '%d/%m/%Y')
                    format_type = "DD/MM/YYYY (precisa conversão)"
                    invalid_dates += 1
                except ValueError:
                    format_type = "Formato desconhecido"
                    invalid_dates += 1
            
            date_formats[format_type] = date_formats.get(format_type, 0) + 1
            print_info(f"   {carga_id}: '{data_carga}' -> {format_type}")
        
        print_info(f"\n📊 RESUMO DE FORMATOS:")
        for formato, count in date_formats.items():
            print_info(f"   {formato}: {count} cargas")
        
        print_info(f"✅ Datas válidas: {valid_dates}")
        print_info(f"❌ Datas inválidas: {invalid_dates}")
        
        if invalid_dates > 0:
            print_warning(f"⚠️ Encontradas {invalid_dates} datas com formato incorreto!")
            print_warning("Isso pode causar problemas nos filtros de data")
        else:
            print_success("✅ Todas as datas estão no formato correto")
        
        self.test_results.append(("Date Formats", True, f"✅ {valid_dates} válidas, {invalid_dates} inválidas"))
        return True
    
    def test_7_list_editable_multi_cargas(self):
        """Teste 7: Listar cargas Multi com status editável"""
        print_header("TESTE 7: Listar cargas Multi com status editável")
        print_info("Objetivo: ver quais estão disponíveis para conferente (não finalizadas)")
        
        editable_statuses = ["aberta", "pausada", "em_andamento"]
        
        print_info(f"Status editáveis para conferente: {editable_statuses}")
        
        # Teste com múltiplos status
        status_param = ",".join(editable_statuses)
        params = {"tipo": "multi", "status": status_param}
        
        status_code, data = self.make_request("/cargas", params)
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Editable Multi", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        total_editable = data.get("total", 0)
        cargas_editable = data.get("cargas", [])
        
        print_info(f"Cargas Multi editáveis: {total_editable}")
        
        if total_editable == 0:
            print_warning("⚠️ NENHUMA carga Multi editável encontrada!")
            print_warning("Conferente não tem cargas Multi para trabalhar")
        else:
            print_success(f"✅ Encontradas {total_editable} cargas Multi editáveis")
            
            # Analisar por status e data
            status_breakdown = {}
            date_breakdown = {}
            
            for carga in cargas_editable:
                carga_id = carga.get("identificador_carga", "N/A")
                status = carga.get("status", "N/A")
                data_carga = carga.get("data", "N/A")
                
                status_breakdown[status] = status_breakdown.get(status, 0) + 1
                date_breakdown[data_carga] = date_breakdown.get(data_carga, 0) + 1
                
                print_info(f"   {carga_id} | Status: {status:12} | Data: {data_carga}")
            
            print_info(f"\n📊 Por status: {status_breakdown}")
            print_info(f"📊 Por data: {dict(sorted(date_breakdown.items()))}")
            
            # Verificar se alguma é de hoje
            today_count = date_breakdown.get(self.today, 0)
            if today_count > 0:
                print_success(f"✅ {today_count} cargas Multi editáveis são de hoje ({self.today})")
            else:
                print_warning(f"⚠️ Nenhuma carga Multi editável é de hoje ({self.today})")
                print_warning("Isso pode explicar por que não aparecem no painel do conferente!")
        
        self.test_results.append(("Editable Multi", True, f"✅ {total_editable} editáveis"))
        return True, total_editable
    
    def run_investigation(self):
        """Run complete investigation"""
        print_header("INVESTIGAÇÃO DE DATAS - CARGAS MULTI-PEDIDOS")
        print_info(f"Backend URL: {BACKEND_URL}")
        print_info("Investigando por que cargas Multi-pedidos não aparecem no painel do conferente")
        print_info("Foco: análise de datas e filtros")
        
        # Authenticate
        if not self.authenticate():
            print_error("Authentication failed, stopping investigation")
            return False
        
        # Run all tests
        try:
            print_info(f"Data de referência inicial: {self.today}")
            
            # Teste 1: Listar todas as Multi sem filtro
            result1 = self.test_1_list_all_multi_without_date_filter()
            if not result1:
                print_error("Teste 1 falhou - não é possível continuar investigação")
                return False
            
            dates_found, status_counts = result1[1], result1[2]
            
            # Teste 2: Verificar data do servidor
            self.test_2_verify_server_date()
            
            # Teste 3: Teste com data de hoje
            result3 = self.test_3_test_with_today_date()
            today_count = result3[1] if result3 else 0
            
            # Teste 4: Teste sem filtros (conferente)
            result4 = self.test_4_test_without_filters_conferente_style()
            conferente_multi_count = result4[1] if result4 else 0
            
            # Teste 5: Range amplo de datas
            self.test_5_test_broad_date_range()
            
            # Teste 6: Verificar formatos de data
            self.test_6_verify_date_formats()
            
            # Teste 7: Cargas editáveis
            result7 = self.test_7_list_editable_multi_cargas()
            editable_count = result7[1] if result7 else 0
            
            # Análise final
            self.print_final_analysis(dates_found, today_count, conferente_multi_count, editable_count)
            
            return True
            
        except Exception as e:
            print_error(f"Investigation failed with exception: {e}")
            return False
    
    def print_final_analysis(self, dates_found, today_count, conferente_multi_count, editable_count):
        """Print final analysis and conclusions"""
        print_header("ANÁLISE FINAL E CONCLUSÕES")
        
        print_info("📋 RESUMO DOS ACHADOS:")
        print_info(f"   • Datas das cargas Multi: {list(dates_found.keys())}")
        print_info(f"   • Cargas Multi para hoje ({self.today}): {today_count}")
        print_info(f"   • Cargas Multi visíveis ao conferente (sem filtros): {conferente_multi_count}")
        print_info(f"   • Cargas Multi editáveis: {editable_count}")
        
        print_header("🔍 DIAGNÓSTICO")
        
        # Diagnóstico principal
        if today_count == 0:
            print_error("❌ PROBLEMA IDENTIFICADO: Nenhuma carga Multi tem data de hoje")
            print_error(f"   As cargas Multi têm datas: {list(dates_found.keys())}")
            print_error(f"   Mas o conferente filtra por data de hoje: {self.today}")
            print_error("   SOLUÇÃO: Verificar se as datas das cargas estão corretas")
        else:
            print_success(f"✅ Existem {today_count} cargas Multi para hoje")
        
        if conferente_multi_count == 0:
            print_error("❌ PROBLEMA: Conferente não vê cargas Multi sem filtros")
            print_error("   Isso indica problema no backend ou filtros padrão")
        else:
            print_success(f"✅ Conferente vê {conferente_multi_count} cargas Multi sem filtros")
        
        if editable_count == 0:
            print_warning("⚠️ Nenhuma carga Multi está em status editável")
            print_warning("   Conferente só vê cargas: aberta, pausada, em_andamento")
        else:
            print_success(f"✅ {editable_count} cargas Multi estão editáveis")
        
        print_header("💡 RECOMENDAÇÕES")
        
        if today_count == 0 and len(dates_found) > 0:
            print_info("1. 📅 PROBLEMA DE DATA:")
            print_info("   • As cargas Multi têm datas diferentes de hoje")
            print_info("   • O painel do conferente provavelmente filtra por data atual")
            print_info("   • Verificar se as datas das cargas estão corretas")
            print_info("   • Ou ajustar o filtro padrão do conferente")
        
        if conferente_multi_count == 0:
            print_info("2. 🔧 PROBLEMA DE FILTRO:")
            print_info("   • Backend pode estar aplicando filtros incorretos")
            print_info("   • Verificar lógica de filtros no painel do conferente")
        
        if editable_count == 0:
            print_info("3. 📊 PROBLEMA DE STATUS:")
            print_info("   • Todas as cargas Multi estão finalizadas")
            print_info("   • Conferente não vê cargas finalizadas")
            print_info("   • Criar cargas Multi com status editável para teste")
        
        # Print test summary
        print_header("RESUMO DOS TESTES")
        for test_name, passed_status, message in self.test_results:
            if passed_status:
                print_success(f"{test_name}: {message}")
            else:
                print_error(f"{test_name}: {message}")

def main():
    """Main function"""
    investigator = MultiPedidosDateInvestigator()
    success = investigator.run_investigation()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 INVESTIGAÇÃO CONCLUÍDA COM SUCESSO{Colors.ENDC}")
        print(f"{Colors.GREEN}Verifique as conclusões acima para identificar a causa do problema{Colors.ENDC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}💥 INVESTIGAÇÃO FALHOU{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()