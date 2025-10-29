#!/usr/bin/env python3
"""
Conferente Filter Test - Specific test to verify the exact filtering logic
that the conferente dashboard uses
"""

import requests
import json
from datetime import datetime

# Configuration
BACKEND_URL = "https://wms-scanner.preview.emergentagent.com/api"

def test_conferente_exact_filters():
    """Test the exact same filters that ConferenteDashboard.js uses"""
    
    print("🔍 TESTING EXACT CONFERENTE DASHBOARD FILTERS")
    print("=" * 60)
    
    # Get today's date (same as line 37-38 in ConferenteDashboard.js)
    today = datetime.now().strftime('%Y-%m-%d')
    print(f"📅 Today's date: {today}")
    
    # Test 1: Exact same API call as ConferenteDashboard (line 94)
    # params = { data: dataSelecionada } with tipoSelecionado = '' (empty)
    print(f"\n1️⃣ TESTING: GET /api/cargas?data={today}")
    print("   (This is exactly what ConferenteDashboard.js does)")
    
    try:
        response = requests.get(f"{BACKEND_URL}/cargas", params={"data": today})
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            cargas = data.get("cargas", [])
            
            print(f"   Total cargas returned: {len(cargas)}")
            
            # Analyze by type and status
            multi_cargas = [c for c in cargas if c.get("tipo") == "multi"]
            caixaria_cargas = [c for c in cargas if c.get("tipo") == "caixaria"]
            
            print(f"   Multi cargas: {len(multi_cargas)}")
            print(f"   Caixaria cargas: {len(caixaria_cargas)}")
            
            # Check status distribution
            status_counts = {}
            multi_status_counts = {}
            
            for carga in cargas:
                status = carga.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
                
                if carga.get("tipo") == "multi":
                    multi_status_counts[status] = multi_status_counts.get(status, 0) + 1
            
            print(f"   All cargas by status: {status_counts}")
            print(f"   Multi cargas by status: {multi_status_counts}")
            
            # Test 2: Apply the frontend filter (line 344)
            # .filter(carga => !ocultarFinalizadas || carga.status !== 'finalizada')
            # Since ocultarFinalizadas = true by default, this becomes:
            # .filter(carga => carga.status !== 'finalizada')
            
            print(f"\n2️⃣ APPLYING FRONTEND FILTER: Remove finalizadas")
            print("   (This is line 344 in ConferenteDashboard.js)")
            
            non_finalized_cargas = [c for c in cargas if c.get("status") != "finalizada"]
            non_finalized_multi = [c for c in non_finalized_cargas if c.get("tipo") == "multi"]
            
            print(f"   Cargas after removing finalizadas: {len(non_finalized_cargas)}")
            print(f"   Multi cargas after removing finalizadas: {len(non_finalized_multi)}")
            
            if len(non_finalized_multi) == 0:
                print("   ❌ PROBLEM FOUND: No Multi cargas visible to conferente!")
                print("   ❌ All Multi cargas are 'finalizada' and get filtered out")
                
                # Show what Multi cargas exist but are hidden
                finalized_multi = [c for c in multi_cargas if c.get("status") == "finalizada"]
                print(f"   📊 Hidden Multi cargas (finalizadas): {len(finalized_multi)}")
                
                for carga in finalized_multi:
                    print(f"      - {carga.get('identificador_carga')} (status: {carga.get('status')})")
                
                return False, "All Multi cargas are finalized and filtered out"
            else:
                print("   ✅ Multi cargas are visible to conferente")
                
                for carga in non_finalized_multi:
                    print(f"      - {carga.get('identificador_carga')} (status: {carga.get('status')})")
                
                return True, f"{len(non_finalized_multi)} Multi cargas visible"
        
        else:
            print(f"   ❌ API Error: {response.status_code}")
            return False, f"API returned {response.status_code}"
            
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return False, str(e)

def main():
    print("CONFERENTE DASHBOARD FILTER VERIFICATION")
    print("Testing the exact same logic as ConferenteDashboard.js")
    
    success, message = test_conferente_exact_filters()
    
    print(f"\n{'='*60}")
    print("CONCLUSION:")
    
    if success:
        print(f"✅ {message}")
        print("✅ Multi-pedidos cargas ARE visible to conferente")
    else:
        print(f"❌ {message}")
        print("❌ This explains why Multi-pedidos don't appear in conferente panel")
        print("💡 SOLUTION: Create Multi cargas with non-finalized status")
        print("   (aberta, pausada, em_andamento)")

if __name__ == "__main__":
    main()