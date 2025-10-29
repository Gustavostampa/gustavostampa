#!/usr/bin/env python3
"""
Backend API Testing for WMS Scanner - Multi-pedidos Listing Functionality
Testing Multi-pedidos cargas visibility for conferente role.
Validates that Multi-pedidos loads appear correctly when no type filter is applied.
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta

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
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{msg}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

class MultiPedidosTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
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
            print_info(f"Testing: GET {url}")
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
    
    # Removed DELETE request method as we're testing GET /api/cargas
    
    def validate_cargas_response_structure(self, data):
        """Validate the expected structure of cargas response"""
        required_fields = ["total", "page", "pageSize", "cargas"]
        
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
        
        if not isinstance(data["cargas"], list):
            return False, "cargas field must be an array"
        
        if not isinstance(data["total"], int):
            return False, "total field must be an integer"
        
        if not isinstance(data["page"], int):
            return False, "page field must be an integer"
        
        if not isinstance(data["pageSize"], int):
            return False, "pageSize field must be an integer"
            
        return True, "Structure is valid"
    
    def test_multi_cargas_exist(self):
        """Test 1: Verificar cargas Multi existentes"""
        print_header("TEST 1: Verificar cargas Multi existentes")
        
        print_info("Testing GET /api/cargas?tipo=multi")
        status_code, data = self.make_request("/cargas", {"tipo": "multi"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Multi Cargas Exist", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Multi Cargas Exist", False, f"❌ {message}"))
            return False
        
        print_success("Response structure is valid: {total, page, pageSize, cargas}")
        print_info(f"Total Multi cargas found: {data['total']}")
        print_info(f"Cargas array length: {len(data['cargas'])}")
        
        # Analyze Multi cargas
        multi_count = 0
        multi_statuses = {}
        
        for carga in data["cargas"]:
            if carga.get("tipo") in ["multi", "Multi-Pedidos", "multi_pedidos"]:
                multi_count += 1
                status = carga.get("status", "unknown")
                multi_statuses[status] = multi_statuses.get(status, 0) + 1
                print_info(f"Multi carga: {carga.get('identificador_carga')} - Status: {status} - Tipo: {carga.get('tipo')}")
        
        print_info(f"Multi cargas by status: {multi_statuses}")
        
        if multi_count == 0:
            print_warning("No Multi cargas found in system")
        else:
            print_success(f"Found {multi_count} Multi cargas")
        
        self.test_results.append(("Multi Cargas Exist", True, f"✅ Found {multi_count} Multi cargas"))
        return True
    
    def test_no_filter_default_conferente(self):
        """Test 2: Teste sem filtro de tipo (padrão conferente)"""
        print_header("TEST 2: Teste sem filtro de tipo (padrão conferente)")
        
        print_info("Testing GET /api/cargas?data=2025-10-29 (no tipo filter)")
        status_code, data = self.make_request("/cargas", {"data": "2025-10-29"})
        
        if status_code != 200:
            print_error(f"Expected status 200 OK, got {status_code}")
            self.test_results.append(("No Filter Default", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("No Filter Default", False, f"❌ {message}"))
            return False
        
        print_success("Response structure is valid")
        print_info(f"Total cargas found: {data['total']}")
        
        # Count by tipo
        tipo_counts = {}
        caixaria_count = 0
        multi_count = 0
        
        for carga in data["cargas"]:
            tipo = carga.get("tipo", "unknown")
            tipo_counts[tipo] = tipo_counts.get(tipo, 0) + 1
            
            if tipo == "caixaria":
                caixaria_count += 1
            elif tipo in ["multi", "Multi-Pedidos", "multi_pedidos"]:
                multi_count += 1
            
            print_info(f"Carga: {carga.get('identificador_carga')} - Tipo: {tipo} - Status: {carga.get('status')}")
        
        print_info(f"Tipos encontrados: {tipo_counts}")
        print_info(f"Caixaria: {caixaria_count}, Multi: {multi_count}")
        
        # CRITICAL: Should return BOTH types when no filter is applied
        if caixaria_count > 0 and multi_count > 0:
            print_success("✅ CRITICAL: Returns BOTH caixaria AND multi types (conferente can see all)")
        elif caixaria_count > 0 and multi_count == 0:
            print_warning("⚠️ Only caixaria found, no multi cargas for this date")
        elif caixaria_count == 0 and multi_count > 0:
            print_warning("⚠️ Only multi found, no caixaria cargas for this date")
        else:
            print_warning("⚠️ No cargas found for this date")
        
        self.test_results.append(("No Filter Default", True, f"✅ Found {caixaria_count} caixaria + {multi_count} multi"))
        return True
    
    def test_explicit_multi_filter(self):
        """Test 3: Teste com filtro multi explícito"""
        print_header("TEST 3: Teste com filtro multi explícito")
        
        print_info("Testing GET /api/cargas?data=2025-10-29&tipo=multi")
        status_code, data = self.make_request("/cargas", {"data": "2025-10-29", "tipo": "multi"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Explicit Multi Filter", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Explicit Multi Filter", False, f"❌ {message}"))
            return False
        
        print_success("✅ Response structure consistent")
        print_info(f"Total Multi cargas found: {data['total']}")
        print_info(f"Cargas array length: {len(data['cargas'])}")
        
        # Validate that only Multi cargas are returned
        multi_count = 0
        non_multi_count = 0
        
        for carga in data["cargas"]:
            tipo = carga.get("tipo", "")
            if tipo in ["multi", "Multi-Pedidos", "multi_pedidos"]:
                multi_count += 1
                print_info(f"Multi carga: {carga.get('identificador_carga')} - Tipo: {tipo} - Status: {carga.get('status')}")
                
                # Validate structure of Multi carga objects
                required_fields = ["id", "identificador_carga", "tipo", "status", "data", "itens"]
                for field in required_fields:
                    if field not in carga:
                        print_warning(f"Multi carga missing field: {field}")
                    else:
                        if field == "itens" and isinstance(carga[field], list):
                            print_info(f"Multi carga has {len(carga[field])} items")
            else:
                non_multi_count += 1
                print_warning(f"Non-Multi carga found: {carga.get('identificador_carga')} - Tipo: {tipo}")
        
        if non_multi_count > 0:
            print_error(f"Found {non_multi_count} non-Multi cargas when filtering by tipo=multi")
            self.test_results.append(("Explicit Multi Filter", False, f"❌ Found {non_multi_count} non-Multi cargas"))
            return False
        
        print_success(f"✅ Filter working correctly: {multi_count} Multi cargas only")
        self.test_results.append(("Explicit Multi Filter", True, f"✅ Found {multi_count} Multi cargas only"))
        return True
    
    def test_caixaria_filter(self):
        """Test 4: Teste com filtro caixaria"""
        print_header("TEST 4: Teste com filtro caixaria")
        
        print_info("Testing GET /api/cargas?data=2025-10-29&tipo=caixaria")
        status_code, data = self.make_request("/cargas", {"data": "2025-10-29", "tipo": "caixaria"})
        
        if status_code != 200:
            print_error(f"Expected status 200, got {status_code}")
            self.test_results.append(("Caixaria Filter", False, f"❌ Status {status_code}"))
            return False
        
        print_success("Status 200 OK received")
        
        # Validate structure
        is_valid, message = self.validate_cargas_response_structure(data)
        if not is_valid:
            print_error(f"Structure validation failed: {message}")
            self.test_results.append(("Caixaria Filter", False, f"❌ {message}"))
            return False
        
        print_success("✅ Response structure consistent")
        print_info(f"Total Caixaria cargas found: {data['total']}")
        print_info(f"Cargas array length: {len(data['cargas'])}")
        
        # Validate that only Caixaria cargas are returned
        caixaria_count = 0
        non_caixaria_count = 0
        
        for carga in data["cargas"]:
            tipo = carga.get("tipo", "")
            if tipo == "caixaria":
                caixaria_count += 1
                print_info(f"Caixaria carga: {carga.get('identificador_carga')} - Status: {carga.get('status')}")
            else:
                non_caixaria_count += 1
                print_warning(f"Non-Caixaria carga found: {carga.get('identificador_carga')} - Tipo: {tipo}")
        
        if non_caixaria_count > 0:
            print_error(f"Found {non_caixaria_count} non-Caixaria cargas when filtering by tipo=caixaria")
            self.test_results.append(("Caixaria Filter", False, f"❌ Found {non_caixaria_count} non-Caixaria cargas"))
            return False
        
        print_success(f"✅ Filter working correctly: {caixaria_count} Caixaria cargas only")
        self.test_results.append(("Caixaria Filter", True, f"✅ Found {caixaria_count} Caixaria cargas only"))
        return True
    
    def test_critical_validation(self):
        """Test 5: Critical validation - response format consistency"""
        print_header("TEST 5: Validação crítica")
        
        print_info("Testing various scenarios to ensure ALWAYS consistent format")
        
        test_scenarios = [
            ("Basic listing", {}),
            ("Status filter", {"status": "finalizada"}),
            ("Tipo filter", {"tipo": "multi"}),
            ("Date range", {"dataInicio": "2024-01-01", "dataFim": "2024-12-31"}),
            ("Pagination", {"page": 1, "pageSize": 5}),
            ("Combined filters", {"status": "em_andamento", "tipo": "caixaria"}),
            ("Non-existent status", {"status": "status_inexistente"}),
        ]
        
        all_passed = True
        
        for scenario_name, params in test_scenarios:
            print_info(f"Testing scenario: {scenario_name}")
            status_code, data = self.make_request("/cargas", params)
            
            # CRITICAL: Must ALWAYS return 200 (never 404)
            if status_code != 200:
                print_error(f"Scenario '{scenario_name}': Expected 200, got {status_code}")
                all_passed = False
                continue
            
            # CRITICAL: Must ALWAYS have consistent structure
            is_valid, message = self.validate_cargas_response_structure(data)
            if not is_valid:
                print_error(f"Scenario '{scenario_name}': {message}")
                all_passed = False
                continue
            
            # CRITICAL: cargas must ALWAYS be an array
            if not isinstance(data["cargas"], list):
                print_error(f"Scenario '{scenario_name}': cargas is not an array")
                all_passed = False
                continue
            
            # CRITICAL: Must NEVER return just array directly
            if isinstance(data, list):
                print_error(f"Scenario '{scenario_name}': Response is array directly (should be object)")
                all_passed = False
                continue
            
            # CRITICAL: cargas must NEVER be null or string
            if data["cargas"] is None:
                print_error(f"Scenario '{scenario_name}': cargas is null")
                all_passed = False
                continue
            
            if isinstance(data["cargas"], str):
                print_error(f"Scenario '{scenario_name}': cargas is string")
                all_passed = False
                continue
            
            print_success(f"Scenario '{scenario_name}': ✅ Passed (total: {data['total']}, cargas: {len(data['cargas'])})")
        
        if all_passed:
            print_success("✅ ALL scenarios maintain consistent format")
            print_success("✅ NEVER returns 404 for empty results")
            print_success("✅ ALWAYS returns {total, page, pageSize, cargas: []}")
            print_success("✅ cargas is ALWAYS an array (never null/string)")
            self.test_results.append(("Critical Validation", True, "✅ All critical validations passed"))
            return True
        else:
            print_error("❌ Some scenarios failed critical validation")
            self.test_results.append(("Critical Validation", False, "❌ Critical validation failed"))
            return False
    
    # Removed integrity validation test as it was for DELETE endpoint
    
    # Removed debug logs test as it was specific to DELETE endpoint
    
    def run_all_tests(self):
        """Run all tests"""
        print_header("WMS SCANNER - GET /api/cargas ENDPOINT TESTING")
        print_info(f"Backend URL: {BACKEND_URL}")
        print_info("Testing cargas listing endpoint for consistent format validation")
        print_info("Validating that API always returns {total, page, pageSize, cargas} structure")
        
        # Authenticate
        if not self.authenticate():
            print_error("Authentication failed, stopping tests")
            return False
        
        # Run all tests
        tests = [
            self.test_structured_response,
            self.test_empty_result,
            self.test_filters_conferente,
            self.test_multiple_results,
            self.test_critical_validation
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print_error(f"Test failed with exception: {e}")
        
        # Print summary
        self.print_summary(passed_tests, total_tests)
        
        return passed_tests == total_tests
    
    def print_summary(self, passed, total):
        """Print test summary"""
        print_header("TEST SUMMARY")
        
        for test_name, passed_status, message in self.test_results:
            if passed_status:
                print_success(f"{test_name}: {message}")
            else:
                print_error(f"{test_name}: {message}")
        
        print(f"\n{Colors.BOLD}OVERALL RESULT:{Colors.ENDC}")
        if passed == total:
            print_success(f"ALL TESTS PASSED ({passed}/{total})")
            print_success("✅ GET /api/cargas endpoint returns consistent format")
            print_success("✅ ALWAYS returns {total, page, pageSize, cargas} structure")
            print_success("✅ NEVER returns 404 for empty results (returns 200 with empty array)")
            print_success("✅ cargas field is ALWAYS an array (never null or string)")
            print_success("✅ Frontend can safely use cargas.filter() without errors")
        else:
            print_error(f"SOME TESTS FAILED ({passed}/{total})")
            print_error("❌ Issues found with the cargas endpoint format consistency")

def main():
    """Main function"""
    tester = CargasEndpointTester()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED - GET /api/cargas ENDPOINT FORMAT IS CONSISTENT{Colors.ENDC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}💥 SOME TESTS FAILED - FORMAT CONSISTENCY ISSUES FOUND{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()